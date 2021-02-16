let client;
const { errorHandler, elasticError, esError } = require('../errorHandler');

// PUT _ilm/policy/filebeat
// {
//   "policy": {
//     "phases": {
//       "hot": {
//         "min_age": "0ms",
//         "actions": {
//           "rollover": {
//             "max_size": "2gb",
//             "max_age": "2d"
//           }
//         }
//       },
// "warm": {
//     "min_age": "1h",
//     "actions": {
//       "forcemerge": {
//         "max_num_segments": 1
//       },
//       "migrate": {
//         "enabled": false
//       },
//       "shrink": {
//         "number_of_shards": 1
//       }
//     },
//       "delete": {
//         "min_age": "5d",
//         "actions": {
//           "delete": {
//             "delete_searchable_snapshot": true
//           }
//         }
//       }
//     }
//   }
// }

const setUpILM = async ({ policyName, sizeMB, hotDuration, warmAfter, deleteAfter }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        
        const options = {};
        const hotPhase = {
            min_age: "0ms",
            actions: {
                rollover: {
                    max_size: sizeMB ? sizeMB : '2gb',
                    max_age: hotDuration ? hotDuration : '2d'
                }
            }
        };
        const warmPhase = {
            min_age: warmAfter ? warmAfter : '1h',
            actions: {
                forcemerge: {
                    max_num_segments: 1
                },
                migrate: {
                    enabled: false
                },
                shrink: {
                    number_of_shards: (primaryShards === 1) ? 1 : (primaryShards - 1)
                }
            }
        };
        const deletePhase = {
            min_age: deleteAfter ? deleteAfter : "15d",
            actions: {
                delete: {
                    delete_searchable_snapshot: true
                }
            }
        };

        options.policy = policyName; //nameOnly
        options.body = options.body.policy = options.body.policy.phases = {};
        options.body.policy.phases.hot = hotPhase;
        options.body.policy.phases.warm = warmPhase;
        options.body.policy.phases.delete = deletePhase;

        const { body: response } = await client.ilm.putLifecycle(options);
        console.log('ILM----->', response);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setUpILM' });
    }
};

const putIndexTemplate = async ({ brand_name, cs_env, primaryShards, replicaShards, overwrite }) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;
        
        const prefix = (cs_env && brand_name) ? `${cs_env}_${brand_name}` : 'defaultElasticLogger';
        const ilmPolicyName = `${prefix}_policy`;
        const options = {};
        options.name = `${prefix}_template`;
        options.create = overwrite ? overwrite : false;
        options.body = {};
        options.body.index_patterns = [`${prefix}_*`];
        options.body.template = {
            settings: {
                number_of_shards: primaryShards,
                number_of_replicas: replicaShards,
                "index.lifecycle.name": ilmPolicyName,
                "index.lifecycle.rollover_alias": `${prefix}`
            }
        };

        const { body: response } = await client.indices.putIndexTemplate(options);
        console.log('IndexTemplateResponse----->', response, body);

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putIndexTemplate' });
    }
};

const bulkIndex = async (logs, index) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = logs.flatMap(log => [{ index: {} }, log]);
        const { body: bulkResponse } = await client.bulk({ index: index, require_alias: true, refresh: true, body });
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
}