let esConnObj;
const axios = require('axios');
const { defaultKibanaValues, defaultInitializationValues, debug } = require('../constants');
const { errorHandler, elasticError, dynamicError } = require('../errorHandler');
const { esClientObj } = require('../elasticHandler/initializeElasticLogger');

const getIndexPatternDetails = async ({ indexPattern }) => {
    try {
        const method = 'GET';
        const apiEndpoint = 'api/index_patterns/_fields_for_wildcard';
        const queryParams = `pattern=${indexPattern}*&meta_fields=_source&meta_fields=_id&meta_fields=_type&meta_fields=_index&meta_fields=_score`;
        const result = await sendRequest({ apiEndpoint, method, queryParams });
        if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPatternDetails details: ', result, '\n');
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getIndexPatternDetails' });
        return false;
    }

};


const putIndexPattern = async ({ indexPattern, indexPatternDetails }) => {
    try {

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putIndexPattern' });
        return false;
    }
};

const refreshIndexPattern = async ({ indexPattern, indexPatternDetails, fromCreate }) => {
    try {
        if (fromCreate) {
        //GET current state
        // const indexPatternDetails = await getIndexPatternDetails({ indexPattern });
        }
        
        // if (indexPatternDetails && indexPatternDetails.statusCode == 200) {
            const putIndexPattern = await putIndexPattern({ indexPattern, indexPatternDetails });
        // }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.refreshIndexPattern' });
    }
};

const createIndexPattern = async ({ brand_name, cs_env, internal = false }) => {
    try {
        let result = false;
        const indexSuffix = '$$';
        const indexPattern = `${cs_env}_${brand_name}${indexSuffix}`;
        const indexPatternDetails = await getIndexPatternDetails({ indexPattern });
        if (indexPatternDetails) {
            const { statusCode } = indexPatternDetails;
            switch (statusCode) {
                case 200:
                    result = await refreshIndexPattern({ indexPattern, indexPatternDetails, fromCreate: true });
                    if (debug) console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern: Existing index refreshed: ', result, '\n');
                    break; //is await needed?
                case 404:
                    const method = 'POST';
                    const apiEndpoint = `api/saved_objects/index-pattern/${indexPattern}`;
                    const postData = {};
                    postData.attributes = {};
                    postData.attributes.title = indexPattern;
                    postData.attributes.timeFieldName = '@timestamp';
                    result = await sendRequest({ apiEndpoint, method, postData });
                    if (debug) console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern: New index created: ', result, '\n');
                    break;
                default:
                    console.log('What?');
            };
            return;
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.createIndexPattern' });
    }
};


const sendRequest = async ({ apiEndpoint, method, queryParams = null, postData = null }) => {
    try {
        if (!esConnObj) esConnObj = require('../elasticHandler/initializeElasticLogger').esClientObj.defaultLoggerDetails.esConnObj;
        const { kibanaUrl } = defaultKibanaValues;
        const { auth, authType } = esConnObj;
        // if (!apiEndpoint || !method) throw new dynamicError({ name: 'KibanaAPI error:', message: `Kibana APIs doesn't support authType: none`, type: 'elastic-logger', status: 777, metadata: { apiEndpoint, method } });
        if (authType == 'none') throw new dynamicError({ name: 'KibanaAPI error:', message: `Kibana APIs doesn't support authType: none`, type: 'elastic-logger', status: 777, metadata: { esClientObj } });

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
        if (postData) options.data = postData;
        // console.log('kibana options--------------->', options);
        const apiResponse = {};
        await axios(options)
            .then((result) => {
                apiResponse.statusCode = result.status;
                apiResponse.body = result.data;
            })
            .catch((err) => {
                console.log('err--------------------------------------------------------->', err);
                apiResponse.body = err;
                apiResponse.errCode = err.code ? err.code : null;
                apiResponse.statusCode = err.statusCode ? err.statusCode : err.message ? Number(err.message.split('code ')[1]) : apiResponse.errCode ? apiResponse.errCode : 511;
            });
        return apiResponse;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.sendRequest' });
    }

};

module.exports = { createIndexPattern };