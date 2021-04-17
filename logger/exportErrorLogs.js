const { errorHandler } = require('../utils/errorHandler');

/**
 * Initiates the `error logger`
 * @param {object} e This defaults to values from `initialisation` object if specified else from `constants.js` - an Object that has 11 properties.
 * @param {object} e.err - (Required) The error object
 * @param {string=} [e.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [e.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.scope] - (Optional) Scope if any can be defined. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [e.status] - (Optional) Status code if any can be defined. Defaults to values from initialisation object if specified else constants.js
 * @param {object=} [e.metadata] - (Optional) Additional metadata to be added. Defaults to values from initialisation object if specified else constants.js
 * @param {boolean=} [e.ship = true] - (Optional) Bool to ship the log to ES. Defaults to values from initialisation object if specified else constants.js
 * @param {boolean=} [e.log = true] - (Optional) Bool to log the error on console. Defaults to values from initialisation object if specified else constants.js
 * 
 */

const exportErrorLogs = async ({ err, microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', scope = 'global', status = null, metadata, ship = true, log = true }) => {
    try {
        // const logObj = await 
        errorHandler({ err, ship, log, timezone, scope, status, exporter: true, batchSize, brand_name, cs_env, microServiceName, metadata });
        // shipDataToElasticsearh({ log: logObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'error' });
    } catch (err) {
        errorHandler({ err, self: true, ship: false, scope: '@niccsj/elastic-logger.exportErrorLogs' });
    }
}

module.exports = {
    exportErrorLogs
};