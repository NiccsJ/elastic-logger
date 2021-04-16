let esConnObj;
exports.esConnObj = esConnObj;
const safeStringify = require('json-stringify-safe');
const { debug } = require('../constants');
const { errorHandler, dynamicError } = require('../errorHandler');
const { isArray } = require('lodash');
const { sendRequest } = require("./sendRequest");

const getIndexPattern = async ({ indexPattern }) => {
    try {
        let indexPatternExists = false;
        const method = 'GET';
        const apiEndpoint = 'api/saved_objects/_find';
        const queryParams = `type=index-pattern&fields=title&per_page=1&search_fields=title&search=${indexPattern}`;
        let result = await sendRequest({ apiEndpoint, method, queryParams });
        const { statusCode, body } = result;

        if (statusCode == 200) {
            const { total, saved_objects } = body;
            if (total <= 0) {
                // result = {};
                result.statusCode = 404;
            } else {
                if (saved_objects && saved_objects[0] && saved_objects[0]['attributes'] && saved_objects[0]['attributes']['title'] == indexPattern) {
                    result.statusCode = 200;
                    result.indexPatternId = saved_objects[0]['id'];
                } else {
                    if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPattern results: ', safeStringify(result), '\nqueryParams: ', queryParams, '\n');
                    console.log('Condition: ', saved_objects[0]['attributes']['title'] == indexPattern);
                    console.log('RESULT: ', saved_objects[0]['attributes']['title']);
                    console.log('LOCAL: ', indexPattern);
                    // result = {};
                    result.statusCode = 404;
                    // if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPatter result in else : ', result, '\n');
                }
            }
        } else {
            result.searchApiFailure = true;
        }
        // if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPattern results: ', safeStringify(result), '\nqueryParams: ', queryParams, '\n');
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getIndexPattern' });
    }

};

const getIndexPatternDetails = async ({ indexPattern }) => {
    try {
        const method = 'GET';
        const apiEndpoint = 'api/index_patterns/_fields_for_wildcard';
        const queryParams = `pattern=${indexPattern}*&meta_fields=_source&meta_fields=_id&meta_fields=_type&meta_fields=_index&meta_fields=_score`;
        let result = await sendRequest({ apiEndpoint, method, queryParams });
        const { statusCode, body } = result;

        if (statusCode == 200) {
            if (body && body.fields && isArray(body.fields)) result.currentIndexFields = body.fields;
        } else if (statusCode == 404) {
            const { message } = result;
            throw new dynamicError({ name: 'KibanaAPI error:', message: `getIndexPatterDetails failed with: ${message}`, type: 'elastic-logger', status: 777 });
        }
        else {
            throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while getting details for index pattern: ${indexPattern}`, type: 'elastic-logger', status: 777, metadata: { result } });
        }
        // if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPatternDetails results: ', safeStringify(result), '\nqueryParams: ', queryParams, '\n');
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getIndexPatternDetails' });
        return false;
    }
};

const putIndexPattern = async ({ indexPattern, indexPatternId, currentIndexFields }) => {
    try {
        const method = 'PUT';
        const apiEndpoint = `api/saved_objects/index-pattern/${indexPatternId}`;
        const postData = {};
        postData.attributes = {};
        postData.attributes.title = indexPattern;
        postData.attributes.timeFieldName = '@timestamp';
        postData.attributes.fields = currentIndexFields;
        let result = await sendRequest({ apiEndpoint, method, postData });
        const { statusCode } = result;
        if (statusCode != 200) throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while putting index details for index pattern: ${indexPattern} with ID: ${indexPatternId}`, type: 'elastic-logger', status: 777, metadata: { result } });
        // if (debug) console.log('\n<><><><> DEBUG <><><><>\nputIndexPattern results: ', safeStringify(result), '\npostData: ', postData, '\n');
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.putIndexPattern' });
        return false;
    }
};

const refreshIndexPattern = async ({ indexPattern, indexPatternId }) => {
    try {
        const { currentIndexFields, statusCode } = await getIndexPatternDetails({ indexPattern });
        if (statusCode != 200) throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while getting details for index pattern: ${indexPattern}`, type: 'elastic-logger', status: 777, metadata: { currentIndexFields, statusCode } });
        const result = await putIndexPattern({ indexPattern, indexPatternId, currentIndexFields });
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.refreshIndexPattern' });
        return false;
    }
};

const createIndexPattern = async ({ brand_name, cs_env, internal = false }) => {
    try {
        let result = false;
        const indexSuffix = '$$*';
        const indexPattern = `${cs_env}_${brand_name}${indexSuffix}`;
        // console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern: indexPattern name: ', indexPattern, '\n');
        const indexPatternInfo = await getIndexPattern({ indexPattern });
        if (indexPatternInfo) {
            const { statusCode, searchApiFailure, indexPatternId } = indexPatternInfo;
            if (searchApiFailure) {
                console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern default case invoked. StatusCode from getIndex: ', statusCode, '\n');
            } else if (statusCode == 200) {
                result = await refreshIndexPattern({ indexPattern, indexPatternId });//is await needed?
                // if (debug) console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern: Existing index refreshed: ', result, '\n');
            } else if (statusCode == 404) {
                const method = 'POST';
                const apiEndpoint = `api/saved_objects/index-pattern/${indexPattern}`;
                const postData = {};
                postData.attributes = {};
                postData.attributes.title = indexPattern;
                postData.attributes.timeFieldName = '@timestamp';
                result = await sendRequest({ apiEndpoint, method, postData });
                const { statusCode } = result;
                if (statusCode != 200) throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while creating index pattern: ${indexPattern}`, type: 'elastic-logger', status: 777, metadata: { result } });
                // if (debug) console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern: New index created: ', result, '\n');
            } else {
                console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern default case invoked. StatusCode from getIndex: ', statusCode, '\n');
            }
        }
        return;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.createIndexPattern' });
    }
};


module.exports = { createIndexPattern };