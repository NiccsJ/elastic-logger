const momentTimezone = require('moment-timezone');
const { shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler } = require('../utils/errorHandler');

/**
 * Initiates the `incoming access` logger
 * @param {object} [a = This Defaults to values from `initialisation` object if specified else from `constants.js`] - an Object that has 5 properties.
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 * 
 */

const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta' }) => {
    return (req, res, next) => {
        try {
            const requestStart = Date.now();
            res.on('finish', () => {
                try {
                    const { headers, httpVersion, method, socket, url, originalUrl } = req;
                    const { remoteAddress, remoteFamily } = socket;
                    const { statusCode, statusMessage } = res;
                    // const headers2 = resp.getHeaders();
                    const processingTime = Date.now() - requestStart;
                    const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                    const dateTime = momentTimezone().tz(timezone).format();
                    const log = { // move to a separate parser
                        url: (url == '/') ? originalUrl : url,
                        method,
                        headers,
                        // headers2,
                        remoteAddress,
                        remoteFamily,
                        statusCode,
                        statusMessage,
                        processingTime,
                        microService: microServiceName ? microServiceName : 'default',
                        logType: 'accessLogs',
                        logDate: date,
                        "@timestamp": dateTime
                    };

                    shipDataToElasticsearh({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });

                } catch (err) {
                    errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportAccessLogs.res.on' });
                    return (req, res, next) => {
                        next();
                    };
                }
            });
            next();
        } catch (err) {
            errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportAccessLogs' });
            next();
        }
    };
};

module.exports = {
    exportAccessLogs
}
