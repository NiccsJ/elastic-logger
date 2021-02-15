let client;
const { errorHandler, elasticError, esError } = require('../errorHandler');

// PUT _ilm/policy/elastic_logger_test
// {
//   "policy": {
//     "phases": {
//       "hot": {
//         "min_age": "0ms",
//         "actions": {
//           "rollover": {
//             "max_age": "30d",
//             "max_size": "10gb",
//             "max_docs": 150
//           },
//           "set_priority": {
//             "priority": 100
//           }
//         }
//       },
//       "warm": {
//         "actions": {
//           "set_priority": {
//             "priority": 50
//           }
//         }
//       },
//       "delete": {
//         "min_age": "5d",
//         "actions": {}
//       }
//     }
//   }
// }


const bulkIndex = async (logs, index) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = logs.flatMap(log => [{ index: { _index: index } }, log]);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
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