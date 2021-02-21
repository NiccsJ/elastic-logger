const { checkSuppliedArguments, shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

const exportErrorLogs = async ({ err, microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', scope = 'global', status = null, metadata, ship = true, log = true }) => {
    try {
        const logObj = await errorHandler({ err, ship, log, timezone, scope, status, exporter: true, brand_name, cs_env, microServiceName, metadata});
        shipDataToElasticsearh({ log: logObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'error' });
    } catch (err) {
        errorHandler({ err, ship: true, scope: '@niccsj/elastic-logger.exportErrorLogs' });
    }
}

module.exports = {
    exportErrorLogs
}