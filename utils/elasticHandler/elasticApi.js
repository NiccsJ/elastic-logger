let client;
const { errorHandler, elasticError, esError } = require('../errorHandler');

const getIndex = async (index) => {

};

const createInitialIndex = async ({ brand_name, cs_env, microServiceName }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        const options = {};
        const aliases = {};
        
        const bootStrapIndex = `${cs_env}_${brand_name}-000000`;
        aliases[`${cs_env}_${brand_name}`] = { "is_write_index": true };

        options.index = bootStrapIndex;
        options.body = {
            aliases
        };

        const { body: response } = client.indices.create(options);

        return true;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.createInitialIndex' });
        return false;
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
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getILM' });
        return false;
    }
};

const setUpILM = async ({ policyName, size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        if (!overwriteILM) if (await getILM(policyName)) return;

        const options = {};
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

        options.policy = policyName; //nameOnly
        options.body = {};
        options.body.policy = {
            phases: {
                hot: hotPhase,
                warm: warmPhase,
                delete: deletePhase
            }
        };

        const { body: response } = await client.ilm.putLifecycle(options);


    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setUpILM' });
    }
};

const putIndexTemplate = async ({ brand_name, cs_env, microServiceName, primaryShards, replicaShards, overwrite }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const options = {};
        const prefix = (cs_env && brand_name) ? `${cs_env}_${brand_name}` : 'default_elastic_logger';
        const ilmPolicyName = `${prefix}_policy`;

        options.name = `${prefix}_template`;
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

       createInitialIndex({ brand_name, cs_env, microServiceName });

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putIndexTemplate' });
    }
};

const bulkIndex = async (logs, index) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = logs.flatMap(log => [{ index: {} }, log]);
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
}