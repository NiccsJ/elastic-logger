let errorLogRequestBatch = [];
let argsValid = false;
const { bulkIndex } = require('../utils/elasticHandler/elasticApi');
const { checkSuppliedArguments, shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

//move this to error handler
const exportErrorLogs = async ({ err, microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta', scope = 'global' }) => {
    try {
        if (!argsValid) argsValid = await checkSuppliedArguments({ err, esConnObj: true, microServiceName, brand_name, cs_env });
        if(!argsValid) throw new elasticError({ name: 'Initialization failed:', message: `exportErrorLogs: Argument(s) missing`, type: 'elastic-logger', status: 999 });
        const log = await errorHandler({ err, ship: true, timezone: timezone, scope, exporter: true });
        shipDataToElasticsearh({ log, batchSize, brand_name, microServiceName, cs_env, checkArgs: false });
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportErrorLogs' });
    }
}

module.exports = {
    exportErrorLogs
}