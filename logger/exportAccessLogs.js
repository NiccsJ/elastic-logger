let incomingRequestBatch = [];
const momentTimezone = require('moment-timezone');
const { checkSuppliedArguments, shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta' }) => {
    return (req, res, next) => {
        try {
            const requestStart = Date.now();
            res.on('finish', () => {
                try {
                    const { headers, httpVersion, method, socket, url } = req;
                    const { remoteAddress, remoteFamily } = socket;
                    const { statusCode, statusMessage } = res;
                    // const headers2 = resp.getHeaders();
                    const processingTime = Date.now() - requestStart;
                    const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                    const dateTime = momentTimezone().tz(timezone).format();
                    const log = { // move to a separate parser
                        url,
                        method,
                        headers,
                        // headers2,
                        remoteAddress,
                        remoteFamily,
                        statusCode,
                        statusMessage,
                        processingTime,
                        logType: 'accessLogs',
                        logDate: date,
                        "@timestamp": dateTime
                    };

                    shipDataToElasticsearh({ log, batchSize, brand_name, microServiceName, cs_env, checkArgs: true });

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
