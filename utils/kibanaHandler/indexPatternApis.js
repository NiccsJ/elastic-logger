const safeStringify = require('json-stringify-safe');
const { debug } = require('../constants');
const { errorHandler, dynamicError } = require('../errorHandler');
// const { isArray } = require('lodash');
const { sendRequest } = require("./sendRequest");

const getIndexPattern = async ({ indexPattern }) => {
    try {
        const method = 'GET';
        const apiEndpoint = 'api/saved_objects/_find';
        const queryParams = `type=index-pattern&fields=title&per_page=5&search_fields=title&search=${indexPattern}`;
        let result = await sendRequest({ apiEndpoint, method, queryParams });
        const { statusCode, body } = result;

        if (statusCode == 200) {
            const { total, saved_objects } = body;
            if (total <= 0) {
                result.statusCode = 404;
            } else {
                const indexPatternExists = saved_objects.some((s) => s['attributes']['title'] == indexPattern );
                if (indexPatternExists) {
                    result.statusCode = 200;
                    result.indexPatternId = saved_objects[0]['id'];
                } else {
                    result.statusCode = 404;
                }
            }
        } else {
            result.searchApiFailure = true;
        }
        if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetIndexPattern results: ', safeStringify(result), '\nqueryParams: ', queryParams, '\n');
        return result;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getIndexPattern' });
    }
};

const getIndexPatternDetails = async ({ indexPattern }) => {
    try {
        const method = 'GET';
        const apiEndpoint = 'api/index_patterns/_fields_for_wildcard';
        const queryParams = `pattern=${indexPattern}&meta_fields=_source&meta_fields=_id&meta_fields=_type&meta_fields=_index&meta_fields=_score`;
        let result = await sendRequest({ apiEndpoint, method, queryParams });
        const { statusCode, body } = result;

        if (statusCode == 200) {
            if (body && body.fields && Array.isArray(body.fields)) result.currentIndexFields = body.fields;
        } else if (statusCode == 404) {
            const { message } = result;
            throw new dynamicError({ name: 'KibanaAPI error:', message: `getIndexPatterDetails failed with: ${message}`, type: 'elastic-logger', status: 777 });
        }
        else {
            throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while getting details for index pattern: ${indexPattern}`, type: 'elastic-logger', status: 777, metadata: { result } });
        }
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
        postData.attributes.fields = JSON.stringify(currentIndexFields);
        let result = await sendRequest({ apiEndpoint, method, postData });
        const { statusCode } = result;
        if (statusCode != 200) throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while putting index details for index pattern: ${indexPattern} with ID: ${indexPatternId}`, type: 'elastic-logger', status: 777, metadata: { result } });
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
        if(result && result.statusCode != 200) throw new dynamicError({ name: 'KibanaAPI error:', message: `Some error occured while update details for index pattern: ${indexPattern}`, type: 'elastic-logger', status: 777, metadata: { result } });
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
        const indexPatternInfo = await getIndexPattern({ indexPattern });
        if (indexPatternInfo) {
            const { statusCode, searchApiFailure, indexPatternId } = indexPatternInfo;
            if (searchApiFailure) {
                console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern default case invoked. StatusCode from getIndex: ', statusCode, '\n');
            } else if (statusCode == 200) {
                result = await refreshIndexPattern({ indexPattern, indexPatternId });//is await needed?
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
            } else {
                console.log('\n<><><><> DEBUG <><><><>\ncreateIndexPattern default case invoked. StatusCode from getIndex: ', statusCode, '\n');
            }
        }
        return;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.createIndexPattern' });
    }
};


module.exports = {
    createIndexPattern
};