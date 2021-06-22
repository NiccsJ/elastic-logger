let client;
const { errorHandler, elasticError } = require('../errorHandler');
const bwcFlatMap = require('array.prototype.flatmap');
const safeStringify = require('json-stringify-safe');
const { debug } = require('../constants');

//Componemt Tempalte
const componetTemplateExists = async (componentTemplateName) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        let componentExists = false;
        const { statusCode: status } = await client.cluster.existsComponentTemplate({ name: componentTemplateName });
        if (status == 200) componentExists = true;
        return componentExists;

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.componetTemplateExists' });
        const { statusCode } = err && err.meta ? err.meta : null;
        if (statusCode === 404) return false; //tempalte doesn't exist
    }
};

const putDefaultComponetTemplate = async ({ mappings, overwriteMappings, componentTemplateName }) => {
    try {
        const notOverwrite = !overwriteMappings; //just to avoid confusion owith the working of create option.
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        if (notOverwrite) if (await componetTemplateExists([componentTemplateName])) return true;
        const options = {};
        options.name = componentTemplateName;
        options.create = !overwriteMappings; //Will overwrite if false, throws an tempalte exists exception otherwise! Yeah, talk about shit that don't make sense!
        options.body = {};
        options.body.template = { mappings };

        const { body: response, statusCode: status } = await client.cluster.putComponentTemplate(options);
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nputDefaultComponetTemplate: ', status, response, '\n');
        if (status == 200) return true;

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putDefaultComponetTemplate' });
        const { statusCode } = (err && err.meta) ? err.meta : null;
        if (statusCode === 400) return false; //resource already exists
    }
};
// ========================================

const createInitialIndex = async ({ brand_name, cs_env }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const options = {};
        const aliases = {};
        const prefix = (cs_env && brand_name) ? `${cs_env}_${brand_name}` : 'default_elastic_logger';
        const bootStrapIndex = `${prefix}$$-000000`;
        aliases[`${prefix}$$`] = { "is_write_index": true };
        options.index = bootStrapIndex;
        options.body = { aliases };
        const { body: response } = await client.indices.create(options);
        return true;

    } catch (err) {
        const { statusCode } = err.meta;
        if (statusCode === 400) return false; //resource already exists
        throw (err);
    }
};

const getIndexTemplate = async (templateName) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        let templateExists = false;
        const options = {};
        options.name = templateName;
        const { statusCode: status } = await client.indices.getIndexTemplate(options);
        if (status == 200) templateExists = true;
        return templateExists;

    } catch (err) {
        const { statusCode } = err.meta;
        if (statusCode === 404) return false; //tempalte doesn't exist
        throw (err);
    }
};

const getILM = async (policy) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        let ilmExists = false;
        const options = { policy };
        const { statusCode: status } = await client.ilm.getLifecycle(options);
        if (status == 200) ilmExists = true;
        return ilmExists;

    } catch (err) {
        const { statusCode } = err.meta;
        if (statusCode === 404) return false; //tempalte doesn't exist
        throw (err);
    }
};

const setUpILM = async ({ policyName, size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        if (!overwriteILM) if (await getILM(policyName)) return;

        const hotPhase = { min_age: "0ms", actions: { rollover: { max_size: size, max_age: hotDuration } } };
        const warmPhase = { min_age: warmAfter, actions: { forcemerge: { max_num_segments: 1 }, migrate: { enabled: false }, shrink: { number_of_shards: shrinkShards } } };
        const deletePhase = { min_age: deleteAfter, actions: { delete: { delete_searchable_snapshot: true } } };

        const options = {};
        options.policy = policyName; //nameOnly
        options.body = {};
        options.body.policy = {};
        options.body.policy.phases = {};
        options.body.policy.phases.hot = hotPhase;
        options.body.policy.phases.warm = warmPhase;
        options.body.policy.phases.delete = deletePhase;

        const { body: response } = await client.ilm.putLifecycle(options);

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setUpILM' });
    }
};

const putIndexTemplate = async ({ brand_name, cs_env, microServiceName, primaryShards, replicaShards, priority, overwrite, dynamicMappings, metadataMappings, overwriteMappings }) => {
    try {
        const notOverwrite = !overwrite; //just to avoid confusion with the working of create option
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        // let updateDefaultComponentTemplate = await putDefaultComponetTemplate({ mappings, overwriteMappings, componentTemplateName });
        const checkOrCreateDynamicTemplateComponent = await putDefaultComponetTemplate({ componentTemplateName: "common_dynamic_template_component_template", mappings: dynamicMappings, overwriteMappings: false });
        const checkOrCreateMetadatComponent = await putDefaultComponetTemplate({ componentTemplateName: "common_metadata_component_template", mappings: metadataMappings, overwriteMappings });
        const prefix = (cs_env && brand_name) ? `${cs_env}_${brand_name}` : 'default_elastic_logger';
        const templateName = `${prefix}_template`;
        const ilmPolicyName = `${prefix}_policy`;
        if (notOverwrite) if (await getIndexTemplate(templateName)) return;

        const options = {};
        options.name = templateName;
        options.create = !overwrite; //Will overwrite if false, throws an tempalte exists exception otherwise! Yeah, talk about shit that don't make sense!
        options.body = {};
        options.body.priority = priority;
        options.body.index_patterns = [`${prefix}$$-*`];
        options.body.template = { settings: { number_of_shards: primaryShards, number_of_replicas: replicaShards, "index.lifecycle.name": ilmPolicyName, "index.lifecycle.rollover_alias": `${prefix}$$` } };
        options.body.composed_of = [];
        if (checkOrCreateDynamicTemplateComponent) options.body.composed_of.push("common_dynamic_template_component_template");
        if (checkOrCreateMetadatComponent) options.body.composed_of.push("common_metadata_component_template");

        const { body: response, statusCode: status } = await client.indices.putIndexTemplate(options);
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nputIndexTemplate: ', response, '\n');
        const bootStrapIndex = await createInitialIndex({ brand_name, cs_env, microServiceName });
        // if (!bootStrapIndex) throw new elasticError({ name: 'ElasticAPI error:', message: '', type: 'elastic-logger', status: 888 });

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putIndexTemplate' });
    }
};

const bulkIndex = async (logs, index) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        // const body = logs.flatMap(log => [{ index: {} }, log]);
        const body = bwcFlatMap(logs, (log) => { return [{ index: {} }, log] });
        const options = {};
        options.index = `${index}$$`;
        options.refresh = true;
        options.body = body;
        const { body: bulkResponse } = await client.bulk(options);

        if (bulkResponse.errors) {
            // const errorObj = bulkResponse.errors.items;
            throw new elasticError({ name: 'ElasticAPI error:', message: `${safeStringify(bulkResponse.items)}`, type: 'elastic-logger', status: 888 });
        }
        //handle error
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nbulkResponse: ', bulkResponse, '\n');
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    bulkIndex,
    setUpILM,
    putIndexTemplate,
    putDefaultComponetTemplate
};