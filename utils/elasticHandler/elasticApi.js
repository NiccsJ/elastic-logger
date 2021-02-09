let client;
const elasticsearch = require('@elastic/elasticsearch');
const { errorHandler, elasticError } = require('@niccsj/elastic-logger/utils/errorHandler');

const connection = async (esConnObj) => {
    try {
        const { url, authType, auth, sniff, sniffOnFault, sniffInterval } = esConnObj;
        const nodeArray = ['----'];
        const options = {};
        // options.name = '@niccsj/eslogg';
        options.node = nodeArray;
        options.maxRetries = 5;
        options.requestTimeout = 60000;
        options.sniffOnStart = sniff ? sniff : false;
        options.sniffOnConnectionFault = sniffOnFault ? sniffOnFault : false;
        options.sniffInterval = sniffInterval ? sniffInterval : false; //eg: 300000: sniffs every 5 miutes

        if (authType != 'none') {
            options.auth = {};
            if (authType == 'basic') {
                options.auth.username = '-----';
                options.auth.password = '------';
            } else if (authType == 'api') {
                options.auth.apiKey = 'apiKey';
            } else {
                throw new elasticError({ name: 'Invalid argument(s) specified:', message: `authType: ${esConnObj.authType} is invalid. Allowed values are: 'none', 'basic', 'api'.`, type: 'nodejs', status: 998 });
            }
        }
        client = new elasticsearch.Client(options);
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
        console.log('body------------->', body);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    // indexDocument,
    bulkIndex,
}