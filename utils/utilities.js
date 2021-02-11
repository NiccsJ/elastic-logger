let batchRequest = [];
const { bulkIndex } = require('./elasticHandler/elasticApi');
const { outBoundApiLogger } = require('../logger/outGoingApiLogger');
const { errorHandler, elasticError } = require('./errorHandler');

const checkSuppliedArguments = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, scope }) => {
    try {
        let argsValid = false;
        if (!err || !esConnObj || !microServiceName || !brand_name || !cs_env) {
            throw new elasticError({ name: 'Argument(s) validation error:', message: `Please supply all required arguments: err, esConnObj, microServiceName, brand_name, cs_env`, type: 'nodejs', status: 998 });
        } else if (esConnObj === true) {
            argsValid = true;
        } else {
            if ((esConnObj && !(esConnObj.authType == 'none' || esConnObj.authType == 'basic' || esConnObj.authType == 'api'))) {
                throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid authType specified: '${esConnObj.authType}'. Allowed values are: 'none', 'basic', 'api'.`, type: 'nodejs', status: 998 });
            } else if (esConnObj && (esConnObj.authType == 'basic' || esConnObj.authType == 'api')) {
                if (!esConnObj.auth) throw new elasticError({ name: 'Argument(s) validation error:', message: `Object 'esConnObj.auth' is required when 'esConnObj.authType' is not 'none'.`, type: 'nodejs', status: 998 });
                if (esConnObj.authType == 'api' && !esConnObj.auth.apiKey) throw new elasticError({ name: 'Argument(s) validation error:', message: `Argument 'esConnObj.auth.apiKey' is required when 'esConnObj.authType' is 'api'.`, type: 'nodejs', status: 998 });
                if (esConnObj.authType == 'basic' && !(esConnObj.auth.user && esConnObj.auth.pass)) throw new elasticError({ name: 'Argument(s) validation error:', message: `Arguments 'esConnObj.auth.user' and 'esConnObj.auth.pass' are required when 'esConnObj.authType' is 'basic'.`, type: 'nodejs', status: 998 });
                argsValid = true;
            } else {
                argsValid = true;
            }
        }
        return argsValid;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.checkSuppliedArguments' });
        return false;
    }
};

const overwriteHttpProtocol = ({ microServiceName, brand_name, cs_env, batchSize = 10, TIMEZONE = "Asia/Calcutta" }) => {
    try {
        const httpObj = require('http');
        const httpsObj = require('https');
        const patch = (object) => {
            const original = object.request;
            object.request = (options, callback) => {
                const requestStart = Date.now();

                let newCallback = () => {
                    let res = arguments[0];
                    let urlArray1 = elasticUrl.split("//");
                    let urlArray2 = urlArray1[1].split(":");
                    let hostname = urlArray2[0];
                    if (options && options.hostname !== hostname) {
                        let href = options.href ? options.href : options.hostname + options.path;
                        outBoundApiLogger({ href, requestStart, res: res.statusCode, microServiceName, brand_name, cs_env, batchSize });
                    }
                    if (callback) {
                        callback.apply(this, arguments);
                    }
                };
                let req = original(options, newCallback);
                return req;
            };
        };

        patch(httpObj);
        patch(httpsObj);
    } catch (err) {
        errorHandler({ err, ship: true, scope: '@niccsj/elastic-logger.overwriteHttpProtocol' });
    }
}

const shipDataToElasticsearh = async ({ log, batchSize, brand_name, cs_env, microServiceName, checkArgs = false }) => {
    try {
        // console.log('log in shipper----->', log, batchSize);
        if (checkArgs) await checkSuppliedArguments({ err: 'api/access logs', esConnObj: true, microServiceName, brand_name, cs_env });
        const index = brand_name + '_' + microServiceName + '_' + cs_env;
        batchRequest.push(log);
        console.log('currentBatchSize, totalBatchSize:', batchRequest.length, batchSize);
        if (batchRequest.length >= batchSize) {
            bulkIndex(batchRequest, index);
            batchRequest = [];
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.shipDataToElasticsearh' });
    }

};

module.exports = {
    checkSuppliedArguments,
    overwriteHttpProtocol,
    shipDataToElasticsearh
};