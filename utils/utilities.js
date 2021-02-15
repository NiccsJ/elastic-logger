let initializerValid = false; //to validate initilization call with default options once
let accessLoggerArgsValid = false; //needs to be validated only once
let apiLoggerArgsValid = false; //needs to be validated only once
let defaultLoggerDetails;
let batchRequest = [];
const { bulkIndex } = require('./elasticHandler/elasticApi');
const { errorHandler, elasticError } = require('./errorHandler');

const getEc2Metadata = async () => {

};

const checkSuppliedArguments = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType }) => {
    try {
        let argsValid = false;
        const suppliedArgs = { err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone };
        let argsMissing = Object.values(suppliedArgs).some(o => !o);

        if (argsMissing && exporterType != 'initializer') {
            if (!defaultLoggerDetails) defaultLoggerDetails = require('../utils/elasticHandler/initializeElasticLogger').esClientObj.defaultLoggerDetails;
            esConnObj = defaultLoggerDetails ? defaultLoggerDetails.esConnObj : 'invalid';
            batchSize = defaultLoggerDetails.batchSize;
            microServiceName = defaultLoggerDetails.microServiceName;
            brand_name = defaultLoggerDetails.brand_name;
            cs_env = defaultLoggerDetails.cs_env;
            timezone = defaultLoggerDetails.timezone;
            argsValid = await checkSuppliedArguments({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType });
            argsMissing = !argsValid;
        }

        if (argsMissing) {
            const missingArgs = [];
            for (key in suppliedArgs) {
                if (!suppliedArgs[key]) missingArgs.push(`{${key}: ${suppliedArgs[key]}}`);
            }
            throw new elasticError({ name: 'Argument(s) validation error:', message: `Please supply all required arguments. Supplied arguments: ${missingArgs}, for exporterType: ${exporterType}`, type: 'elastic-logger', status: 998 });
        } else if (esConnObj === true) {
            argsValid = true;
        } else {
            if ((esConnObj && !(esConnObj.authType == 'none' || esConnObj.authType == 'basic' || esConnObj.authType == 'api'))) {
                throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid authType specified: '${esConnObj.authType}'. Allowed values are: 'none', 'basic', 'api'.`, type: 'elastic-logger', status: 998 });
            } else if (esConnObj && (esConnObj.authType == 'basic' || esConnObj.authType == 'api')) {
                if (!esConnObj.auth) throw new elasticError({ name: 'Argument(s) validation error:', message: `Object 'esConnObj.auth' is required when 'esConnObj.authType' is not 'none'.`, type: 'elastic-logger', status: 998 });
                if (esConnObj.authType == 'api' && !esConnObj.auth.apiKey) throw new elasticError({ name: 'Argument(s) validation error:', message: `Argument 'esConnObj.auth.apiKey' is required when 'esConnObj.authType' is 'api'.`, type: 'elastic-logger', status: 998 });
                if (esConnObj.authType == 'basic' && !(esConnObj.auth.user && esConnObj.auth.pass)) throw new elasticError({ name: 'Argument(s) validation error:', message: `Arguments 'esConnObj.auth.user' and 'esConnObj.auth.pass' are required when 'esConnObj.authType' is 'basic'.`, type: 'nodejs', status: 998 });
                argsValid = true;
            } else {
                argsValid = true;
            }
        }
        if (exporterType === 'initializer') initializerValid = argsValid;
        return argsValid;
    } catch (err) {
        throw (err);
    }
};

const shipDataToElasticsearh = async ({ log, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType }) => {
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
        }
        batchSize = batchSize ? batchSize : defaultLoggerDetails.batchSize;
        const index = brand_name + '_' + microServiceName + '_' + cs_env;
        batchRequest.push(log);
        if ((batchRequest.length >= batchSize)) {
            bulkIndex(batchRequest, index);
            batchRequest = [];
        }

    } catch (err) {
        errorHandler({ err, ship: true, scope: '@niccsj/elastic-logger.shipDataToElasticsearh' });
    }
};

module.exports = {
    checkSuppliedArguments,
    shipDataToElasticsearh
};