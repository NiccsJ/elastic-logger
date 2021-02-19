const { checkSuppliedArguments, shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

const exportErrorLogs = async ({ err, microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', scope = 'global', status = null, metadata }) => {
    try {
        const log = await errorHandler({ err, ship: true, timezone, scope, status, exporter: true, brand_name, cs_env, microServiceName, metadata});
        shipDataToElasticsearh({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'error' });
    } catch (err) {
        errorHandler({ err, ship: true, scope: '@niccsj/elastic-logger.exportErrorLogs' });
    }
}

module.exports = {
    exportErrorLogs
}