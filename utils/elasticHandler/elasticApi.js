let client;
const elasticsearch = require('@elastic/elasticsearch');
const { errorHandler, elasticError } = require('../errorHandler');

const connection = async (esConnObj) => {
    try {
        const { url, authType, auth, sniff, sniffOnFault, sniffInterval } = esConnObj;
        const nodeArray = url.split(',');
        const options = {};
        // options.name = '@niccsj/eslogg';
        options.node = nodeArray;
        options.maxRetries = 5;
        options.requestTimeout = 10000;
        options.sniffOnStart = sniff ? sniff : false;
        options.sniffOnConnectionFault = sniffOnFault ? sniffOnFault : false;
        options.sniffInterval = sniffInterval ? sniffInterval : false; //eg: 300000: sniffs every 5 miutes

        if (authType != 'none') {
            options.auth = {};
            if (authType == 'basic') {
                options.auth.username = auth.user;
                options.auth.password = auth.pass;
            } else if (authType == 'api') {
                options.auth.apiKey = auth.pass;
            } else { //not needed now
                throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid authType specified: '${esConnObj.authType}'. Allowed values are: 'none', 'basic', 'api'.`, type: 'nodejs', status: 998 });
            }
        }
        client = new elasticsearch.Client(options);
        console.log('-----------------------INITIALIZED-----------------------');
        return true;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.connection' });
        return false;
    }
};

const bulkIndex = async (data, index, esConnObj) => {
    try {
        if (!client) await connection(esConnObj);
        const body = data.flatMap(log => [{ index: { _index: index } }, log]);
        console.log('invoking bulkApi with client--->', client);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
        if (bulkResponse.error) {
            throw new elasticError({ name: 'ElasticAPI error:', message: `Unable to shipt logs .via bulkIndex API`, type: 'elasticsearch', status: 888 });
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    // indexDocument,
    bulkIndex,
}