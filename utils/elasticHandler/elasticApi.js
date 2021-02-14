let client;
const { errorHandler, elasticError, esError } = require('../errorHandler');

const bulkIndex = async (logs, index) => {
    try {
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = logs.flatMap(log => [{ index: { _index: index } }, log]);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
        if (bulkResponse.errors) {
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