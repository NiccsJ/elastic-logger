const { errorHandler, elasticError } = require('./errorHandler');

const checkSuppliedArguments = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, scope }) => {
    try {
        if (!err || !esConnObj || !microServiceName || !brand_name || !cs_env) throw new elasticError({ name: 'Argument(s) missing', message: `elastic-logger can not initialize.`, type: 'nodejs', status: 999 });
        if (!(esConnObj && (esConnObj.authType != 'none' || esConnObj.authType != 'basic' || esConnObj.authType != 'api'))) throw new elasticError({ name: 'Invalid argument(s) specified:', message: `authType: ${esConnObj.authType} is invalid. Allowed values are: 'none', 'basic', 'api'.`, type: 'nodejs', status: 998 });
        if (esConnObj && esConnObj.authType != 'none' && !esConnObj.auth) throw new elasticError({ name: 'Argument(s) missing', message: `elastic-logger can not initialize: 'esConnObj.auth' is required.`, type: 'nodejs', status: 999 });
        return true;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.checkSuppliedArguments' });
        return false;
    }
};

module.exports = {
    checkSuppliedArguments
};