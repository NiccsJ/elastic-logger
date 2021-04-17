let esConnObj;
const safeStringify = require('json-stringify-safe');
const axios = require('axios');
const { defaultKibanaValues, debug } = require('../constants');
const { errorHandler, dynamicError } = require('../errorHandler');

const sendRequest = async ({ apiEndpoint, method, queryParams = null, postData = null }) => {
    try {
        if (!esConnObj)
            esConnObj = require('@niccsj/elastic-logger/utils/elasticHandler/initializeElasticLogger').esClientObj.defaultLoggerDetails.esConnObj;
        const { kibanaUrl } = defaultKibanaValues;
        const { auth, authType } = esConnObj;
        if (authType == 'none') throw new dynamicError({ name: 'KibanaAPI error:', message: `Kibana APIs doesn't support authType: none`, type: 'elastic-logger', status: 777, metadata: { result } });

        const options = {};
        options.method = method;
        options.headers = {};
        options.headers['content-type'] = 'application/json';
        options.headers['kbn-xsrf'] = 'true';
        if (authType == 'basic') {
            const { user, pass } = auth;
            const credentials = `${user}:${pass}`;
            options.headers['authorization'] = `Basic ${Buffer.from(credentials, 'binary').toString('base64')}`;
        } else {
            const { apiKey } = auth;
            options.headers['authorization'] = `ApiKey ${apiKey}`;
        }

        apiEndpoint = (apiEndpoint == '/') ? '' : apiEndpoint;
        options.url = !queryParams ? (kibanaUrl + '/' + apiEndpoint) : (kibanaUrl + '/' + apiEndpoint + '?' + queryParams);
        if (postData)
            options.data = postData;
        const apiResponse = {};
        await axios(options)
            .then((result) => {
                apiResponse.statusCode = result.status;
                apiResponse.body = result.data;
            })
            .catch((err) => {
                apiResponse.body = err;
                apiResponse.errCode = err.code ? err.code : null;
                apiResponse.statusCode = err.statusCode ? err.statusCode : err.message ? Number(err.message.split('code ')[1]) : apiResponse.errCode ? apiResponse.errCode : 511;
                // if (debug) console.log('\n<><><><> DEBUG <><><><>\nSendRequest METHOD and API: ', method, apiEndpoint, '\nSendRequest result: ', safeStringify(apiResponse), '\n');
            });
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nSendRequest METHOD and API: ', method, apiEndpoint, '\nSendRequest result: ', safeStringify(apiResponse), '\n');
        return apiResponse;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.sendRequest' });
    }
};

module.exports = { 
    sendRequest
};
