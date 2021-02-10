let errorLogRequestBatch = [];
const { bulkIndex } = require('../utils/elasticHandler/elasticApi');
const { checkSuppliedArguments } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

//move this to error handler
const exportErrorLogs = async ({ err, microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta', scope = 'global' }) => {
    try {
        const proceed = await checkSuppliedArguments({ err, esConnObj: true , microServiceName, brand_name, cs_env });
		if (!proceed) throw new elasticError({ name: 'Initialization failed:', message: `exportErrorLogs: Argument(s) missing`, type: 'elastic-logger', status: 999 });
        const log = await errorHandler({ err, ship: true, timezone: timezone, scope, exporter: true });
        errorLogRequestBatch.push(log);
        if (errorLogRequestBatch.length >= batchSize) {
            const index = brand_name + '_' + microServiceName + '_' + cs_env;
            bulkIndex(errorLogRequestBatch, index);
            errorLogRequestBatch = [];
        }
        // errorLogRequestBatch.push(log);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportErrorLogs' });
    }
}

module.exports = {
    exportErrorLogs
}