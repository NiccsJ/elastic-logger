const { esClientObj } = require('./initializeElasticLogger');
const { errorHandler, elasticError } = require('@niccsj/elastic-logger/utils/errorHandler');


const bulkIndex = async (data, index) => {
    try {
        let client = (esClientObj && esClientObj.client) ? esClientObj.client : null;
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = data.flatMap(log => [{ index: { _index: index } }, log]);
        // console.log('invoking bulkApi with client--->', client);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
        if (bulkResponse.error) {
            throw new elasticError({ name: 'ElasticAPI error:', message: `Unable to shipt logs .via bulkIndex API`, type: 'elasticsearch', status: 888 });
        }

        console.log('bulkResponse---->', bulkResponse);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    // indexDocument,
    bulkIndex,
}