let client;
const { errorHandler, elasticError, dynamicError } = require('../errorHandler');
const bwcFlatMap = require('array.prototype.flatmap');

//handle bootstrapping index
//add cloud metadata

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
        if(statusCode === 404 ) return false; //tempalte doesn't exist
        throw (err);  
    }
};

const createInitialIndex = async ({ brand_name, cs_env, microServiceName }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const options = {};
        const aliases = {};
        const bootStrapIndex = `${cs_env}_${brand_name}-000000`;
        aliases[`${cs_env}_${brand_name}`] = { "is_write_index": true };
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
        if(statusCode === 404 ) return false; //tempalte doesn't exist
        throw (err);
    }
};

const setUpILM = async ({ policyName, size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        if (!overwriteILM) if (await getILM(policyName)) return;

        const hotPhase = {
            min_age: "0ms",
            actions: {
                rollover: {
                    max_size: size,
                    max_age: hotDuration
                }
            }
        };
        const warmPhase = {
            min_age: warmAfter,
            actions: {
                forcemerge: {
                    max_num_segments: 1
                },
                migrate: {
                    enabled: false
                },
                shrink: {
                    number_of_shards: shrinkShards
                }
            }
        };
        const deletePhase = {
            min_age: deleteAfter,
            actions: {
                delete: {
                    delete_searchable_snapshot: true
                }
            }
        };

        const options = {};
        options.policy = policyName; //nameOnly
        options.body = {};
        options.body.policy = {};
        options.body.policy.phases = {};
        options.body.phases.hot = hotPhase;
        options.body.phases.warm = warmPhase;
        options.body.phases.delete = deletePhase;

        const { body: response } = await client.ilm.putLifecycle(options);

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setUpILM' });
    }
};

const putIndexTemplate = async ({ brand_name, cs_env, microServiceName, primaryShards, replicaShards, overwrite }) => {
    try {
        const prefix = (cs_env && brand_name) ? `${cs_env}_${brand_name}` : 'default_elastic_logger';
        const templateName = `${prefix}_template`;
        const ilmPolicyName = `${prefix}_policy`;

        if (await getIndexTemplate(templateName)) return;
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const options = {};
        options.name = templateName;
        options.create = overwrite ? overwrite : false;
        options.body = {};
        options.body.index_patterns = [`${prefix}-*`];
        options.body.template = {
            settings: {
                number_of_shards: primaryShards,
                number_of_replicas: replicaShards,
                "index.lifecycle.name": ilmPolicyName,
                "index.lifecycle.rollover_alias": `${prefix}`
            }
        };

        const { body: response } = await client.indices.putIndexTemplate(options);
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
        const body = bwcFlatMap(logs, (log) => { return [{ index: {}}, log ] });
        const options = {};
        options.index = index;
        options.refresh = true;
        options.body = body;
        const { body: bulkResponse } = await client.bulk(options);

        if (bulkResponse.errors) {
            const errorObj = bulkResponse.errors.items;
            throw new elasticError({ name: 'ElasticAPI error:', message: `${JSON.stringify(bulkResponse.items)}`, type: 'elastic-logger', status: 888 });
        }
        //handle error
        console.log('bulkResponse---->', bulkResponse);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    bulkIndex,
    setUpILM,
    putIndexTemplate
};