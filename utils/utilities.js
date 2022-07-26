let initializerValid = false; //to validate initilization call with default options once
let accessLoggerArgsValid = false; //needs to be validated only once
let apiLoggerArgsValid = false; //needs to be validated only once
let defaultLoggerDetails;
let batchRequest = [];
let cachedCloudMetadata;
// let argCheckCount = 0;
const axios = require('axios');
const { bulkIndex } = require('./elasticHandler/elasticApi');
const { errorHandler, elasticError } = require('./errorHandler');
var {
    defaultInitializationValues,
    debug,
    cloudType,
    enableCloudMetadata,
    AWS_METADATA_ENDPOINT_MAPPINGS,
    AWS_METADATA_BASE_URL,
    AWS_METADATA_ENDPOINT,
    DEFAULT_AWS_METADATA_OBJECT
} = require('./constants');

const isEC2 = async () => {
    try {
        let status = false;
        const config = {};
        config.timeout = 500;
        await axios.get(AWS_METADATA_BASE_URL, config)
            .then(response => { status = true })
            .catch(err => {
                if (err.code === 'ECONNABORTED') { //timeout
                    status = false;
                } else {
                    throw err;
                }
            });
        return status;
    } catch (err) {
        errorHandler({ err, self: true, ship: false, scope: '@niccsj/elastic-logger.isEC2' });
        return false;
    }
};

const getCloudMetadata = async (cloudType) => {
    try {
        const cloudMetadataObj = {};
        const config = {};
        config.timeout = 1000;
        switch (cloudType) {
            case 'aws':
                if (!await isEC2()) {
                    cloudMetadataObj.type = 'not aws';
                    cachedCloudMetadata = cloudMetadataObj;
                    return cloudMetadataObj;
                }
                cloudMetadataObj.type = 'aws';
                cloudMetadataObj.data = {};
                for (let key in AWS_METADATA_ENDPOINT_MAPPINGS) {
                    await axios.get(`${AWS_METADATA_ENDPOINT}${AWS_METADATA_ENDPOINT_MAPPINGS[key]}`, config)
                        .then(response => { cloudMetadataObj.data[key] = response && response.data ? response.data : 'Unable to fetch ${key}' })
                        .catch(err => { cloudMetadataObj.data[key] = `Error in fetching ${key}.` });
                }
                break;
            default:
                cloudMetadataObj.type = `Unrecognized cloud type: ${cloudType}.`;
                // throw new elasticError({ name: `Unrecognized Cloud Type:`, message: `Supplied cloud type isn't supported: ${cloudType}. Allowed values are: 'aws'.`, type: 'elastic-logger', status: 998 });
                break;
        }
        cachedCloudMetadata = cloudMetadataObj;
        if (debug) console.log('\n<><><><> DEBUG <><><><>\ngetCloudMetadata: ', 'cachedCloudMetadata: ', cachedCloudMetadata, '\n<><><><> DEBUG <><><><>\n');
        return cloudMetadataObj;
    } catch (err) {
        errorHandler({ err, self: true, ship: false, scope: '@niccsj/elastic-logger.getCloudMetadata' });
        cachedCloudMetadata = cloudMetadataObj;
        return cachedCloudMetadata; //caching in case of error as well. To avoid, repetitive calls to getCloudMetadata
    }
};

if (enableCloudMetadata) getCloudMetadata(cloudType);

const checkSuppliedArguments = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType }, argCheckCount = 0) => {
    try {
        if (debug) console.log('\n<><><><> DEBUG <><><><>\ncheckSuppliedArguments: ', 'exporterType: ', exporterType, '\n<><><><> DEBUG <><><><>\n');
        let argsValid = false;
        const suppliedArgs = { err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone };
        let argsMissing = Object.values(suppliedArgs).some(o => !o);

        if (argCheckCount < 3 && argsMissing && exporterType != 'initializer') {
            if (debug) console.log('\n<><><><> DEBUG <><><><>\nARGS MISSING: ', JSON.stringify(suppliedArgs, null, 4), '\n<><><><> DEBUG <><><><>\n');
            if (!defaultLoggerDetails) defaultLoggerDetails = require('../utils/elasticHandler/initializeElasticLogger').esClientObj.defaultLoggerDetails;
            argCheckCount++;
            const newDefaultLogger = {};
            newDefaultLogger.esConnObj = (defaultLoggerDetails && defaultLoggerDetails.esConnObj) ? defaultLoggerDetails.esConnObj : defaultInitializationValues.esConnObj;
            newDefaultLogger.batchSize = (defaultLoggerDetails && defaultLoggerDetails.batchSize) ? defaultLoggerDetails.batchSize : defaultInitializationValues.batchSize;
            newDefaultLogger.microServiceName = (defaultLoggerDetails && defaultLoggerDetails.microServiceName) ? defaultLoggerDetails.microServiceName : defaultInitializationValues.microServiceName;
            newDefaultLogger.brand_name = (defaultLoggerDetails && defaultLoggerDetails.brand_name) ? defaultLoggerDetails.brand_name : defaultInitializationValues.brand_name;
            newDefaultLogger.cs_env = (defaultLoggerDetails && defaultLoggerDetails.cs_env) ? defaultLoggerDetails.cs_env : defaultInitializationValues.cs_env;
            newDefaultLogger.timezone = (defaultLoggerDetails && defaultLoggerDetails.timezone) ? defaultLoggerDetails.timezone : defaultInitializationValues.timezone;
            defaultLoggerDetails = { ...newDefaultLogger };
            newDefaultLogger.err = err;
            newDefaultLogger.exporterType = exporterType;
            argsValid = await checkSuppliedArguments(newDefaultLogger, argCheckCount);
            argsMissing = !argsValid;
        }

        if (argsMissing) {
            const missingArgs = [];
            for (key in suppliedArgs) {
                if (!suppliedArgs[key]) missingArgs.push(`{${key}: ${suppliedArgs[key]}}`);
            }
            throw new elasticError({ name: 'Argument(s) validation error:', message: `Please supply all required arguments. Supplied arguments: ${missingArgs}, for exporterType: ${exporterType}`, type: 'elastic-logger', status: 998 });
        }
        // else if (esConnObj === true) {
        //     argsValid = true;
        // }
        else {
            if (debug) console.log('\n<><><><> DEBUG <><><><>\nARGS NOT MISSING: ', JSON.stringify(suppliedArgs, null, 4), '\n<><><><> DEBUG <><><><>\n');
            if ((esConnObj && !(esConnObj.authType == 'none' || esConnObj.authType == 'basic' || esConnObj.authType == 'api'))) {
                throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid authType specified: '${esConnObj.authType}'. Allowed values are: 'none', 'basic', 'api'.`, type: 'elastic-logger', status: 998 });
            } else if (esConnObj && (esConnObj.authType == 'basic' || esConnObj.authType == 'api')) {
                if (!esConnObj.auth) throw new elasticError({ name: 'Argument(s) validation error:', message: `Object 'esConnObj.auth' is required when 'esConnObj.authType' is not 'none'.`, type: 'elastic-logger', status: 998 });
                if (esConnObj.authType == 'api' && !esConnObj.auth.apiKey) throw new elasticError({ name: 'Argument(s) validation error:', message: `Argument 'esConnObj.auth.apiKey' is required when 'esConnObj.authType' is 'api'.`, type: 'elastic-logger', status: 998 });
                if (esConnObj.authType == 'basic' && !(esConnObj.auth.username && esConnObj.auth.password)) throw new elasticError({ name: 'Argument(s) validation error:', message: `Arguments 'esConnObj.auth.username' and 'esConnObj.auth.password' are required when 'esConnObj.authType' is 'basic'.`, type: 'nodejs', status: 998 });
                argsValid = true;
            } else {
                argsValid = true;
            }
            if (!defaultLoggerDetails) defaultLoggerDetails = suppliedArgs; //initialise the deafaultLoggerDeatils
        }
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nES CLIENT OBJ DEFAULT LOGGER DETAILS OUTSIDE: ', JSON.stringify(defaultLoggerDetails, null, 4), '\n<><><><> DEBUG <><><><>\n');
        if (exporterType === 'initializer') initializerValid = argsValid;
        return argsValid;
    } catch (err) {
        // throw(err);
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.checkSuppliedArguments' });
    }
};

const shipDataToElasticsearch = async ({ log, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType }) => {
    try {
        let errorLoggerArgsValid = false; //to be validated on evey call

        switch (exporterType) {
            case 'api':
                if (!apiLoggerArgsValid) apiLoggerArgsValid = await checkSuppliedArguments({ err: log, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType });
                break;
            case 'access':
                if (!accessLoggerArgsValid) accessLoggerArgsValid = await checkSuppliedArguments({ err: log, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType });
                break;
            case 'error':
                if (!errorLoggerArgsValid) errorLoggerArgsValid = await checkSuppliedArguments({ err: log, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType });
                break;
            default:
                console.log('hmmmmmmm.....default? How?', exporterType);
                throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid exporterType specified: '${exporterType}'. Allowed values are: 'initializer', 'access', and 'api'.`, type: 'elastic-logger', status: 998 });
        };
        //adding cloud-meta-data if enabled
        if (enableCloudMetadata) log['cloud-meta-data'] = cachedCloudMetadata ? cachedCloudMetadata : DEFAULT_AWS_METADATA_OBJECT;

        batchSize = batchSize ? batchSize : defaultLoggerDetails.batchSize;
        brand_name = brand_name ? brand_name : defaultLoggerDetails.brand_name;
        cs_env = cs_env ? cs_env : defaultLoggerDetails.cs_env;
        const index = `${cs_env}_${brand_name}`;
        batchRequest.push(log);
        if (debug) console.log('\n<><><><> DEBUG <><><><>\nCurrent Batch: ', batchRequest.length, 'Total Batch Size: ', batchSize, 'Index: ', index, '\n<><><><> DEBUG <><><><>\n');
        if ((batchRequest.length >= batchSize)) {
            bulkIndex(batchRequest, index);
            batchRequest = [];
        }
    } catch (err) {
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.shipDataToElasticsearch' });
    }
};

const isObjEmpty = (obj) => {
    try {
        for (let key in obj) { if (obj.hasOwnProperty(key)) return false; }
        return true;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.isObjEmpty' });
        return true;
    }

};

const isLogBodyEnabled = (headers, statusCode) => {
    let status = false;
    try {
        const { logbody, skipstatus, includestatus } = headers;
        if (!logbody) return status;
        if (logbody.toString() == 'true') {
            if (skipstatus || includestatus) {
                statusCode = statusCode?.toString();
                const skipStatusArray = skipstatus?.split(',').map(s => s?.trim());
                const includeStatusArray = includestatus?.split(',').map(s => s?.trim());

                if (debug) console.log('\n<><><><> DEBUG <><><><>\nskipStatusArray: ', skipStatusArray, '\n<><><><> DEBUG <><><><>\n');
                if (debug) console.log('\n<><><><> DEBUG <><><><>\nincludeStatusArray: ', includeStatusArray, '\n<><><><> DEBUG <><><><>\n');

                if (Array.isArray(skipStatusArray) || Array.isArray(includeStatusArray)) {
                    if (includeStatusArray?.includes(statusCode)) {
                        if (debug) console.log('<><><> INCLUDE <><><>', statusCode, includeStatusArray, skipStatusArray);
                        status = true;
                    }
                    if (!(skipStatusArray ? skipStatusArray?.includes(statusCode) : true)) {
                        if (debug) console.log('<><><> SKIP <><><>', statusCode, includeStatusArray, skipStatusArray);
                        status = true;
                    }
                }
            } else {
                status = true;
            }
        }
    } catch (err) {
        status = false;
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.isLogBodyEnabled' }); //should ship be true? //no, will create too much traffic in error logs
    }
    return status;
};

const getLogBody = (reqHeaders, body, statusCode, type = 'req') => { //type not being used for now
    let finalBody = {};
    try {
        if (!body || isObjEmpty(body)) return finalBody = { elasticBodyDefault: 'body not found in the request' };
        if (!reqHeaders || isObjEmpty(reqHeaders)) return finalBody = { elasticBodyDefault: 'headers not found in the request' };
        if (!isLogBodyEnabled(reqHeaders, statusCode)) return finalBody = { elasticBodyDefault: 'body logging not enabled for this request' };

        // const contentType = type == 'res' ? resHeaders['content-type'] : reqHeaders['content-type'];

        // switch (true) {
        //     case (contentType == 'application/json' || new RegExp('application\/json').test(contentType)):
        //         {
        //             try {
        //                 if (body && typeof(body) != "object") throw new Error('Invalid json received');
        //                 const jsonString = JSON.stringify(body);
        //                 finalBody.json = body; //convert all keys of body to string recursively? //too much work and might cause cpu load
        //             } catch (err) {
        //                 finalBody.elasticBodyDefault = `Invalid json received: ${body}`;
        //             }
        //         }
        //         break;
        //     case (contentType == 'text/plain' || new RegExp('text\/plain').test(contentType)):
        //         finalBody.text = body; //is to string required? maybe yes, if body is a number //seems all text is converted to string by default
        //         break;
        //     //TO-DO: case to handle form-data
        //     default:
        //         finalBody.elasticBodyDefault = `Unrecognized or unhandled content-type received: ${contentType}`;
        // }

        try {
            const jsonString = JSON.stringify(body, null, 2);
            finalBody.elasticBody = jsonString;
        } catch (err) {
            finalBody.elasticBodyDefault = `Couldn't parse body: ${body}`;
        }

    } catch (err) {
        // let metadata = {  }; //pass request params to identify for which req the error came from? Also, will need to set ship to true for this.
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.getLogBody' });
        finalBody.elasticBodyDefault = `Error while parsing body`;
    }
    return finalBody;
};

const patchObjectDotFunctions = (fnType, bodyArray, object, objectType) => { //todo: add configurable limit on body size
    try {
        switch (fnType) {
            case 'write':
                {
                    const original = object.write;
                    object.write = function () {
                        try {
                            bodyArray.push(Buffer.from(arguments[0]));
                            // const body = Buffer.concat(bodyArray).toString('utf8');
                            objectType == 'req' ? object.reqBodytempBuffer = bodyArray : object.reqBodytempBuffer = bodyArray;
                            return original.apply(this, arguments);
                        } catch (err) {
                            errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.patchObjectDotFunctions.case.write' });
                            return original.apply(this, arguments);
                        }
                    };
                    break;
                }
            case 'end':
                {
                    const original = object.end;
                    object.end = function () {
                        try {
                            if (arguments[0]) bodyArray.push(Buffer.from(arguments[0]));
                            const body = Buffer.concat(bodyArray).toString('utf8');
                            objectType == 'req' ? object.reqBody = body : object.resBody = body;
                            return original.apply(this, arguments);
                        } catch (err) {
                            errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.patchObjectDotFunctions.case.end' });
                            return original.apply(this, arguments);
                        }
                    };
                    break;
                }
            case 'send':
                {
                    // if (typeof object != '') return;
                    const original = object.send;
                    object.send = function (body) {
                        try {
                            objectType == 'req' ? object.reqBody = body : object.resBody = body;
                            return original.apply(this, arguments);
                        } catch (err) {
                            errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.patchObjectDotFunctions.case.send' });
                            return original.apply(this, arguments);
                        }
                    };
                }
            default:
                throw new elasticError({});
        };
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.patchObjectDotFunctions' });
    }
};

module.exports = {
    checkSuppliedArguments,
    shipDataToElasticsearch,
    isObjEmpty,
    isLogBodyEnabled,
    getLogBody,
    patchObjectDotFunctions
};