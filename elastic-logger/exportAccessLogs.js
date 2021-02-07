const momentTimezone = require('moment-timezone');
const { bulkIndex } = require('./crudApi');
// const TIMEZONE = "Asia/Calcutta";
let incomingRequestBatch = [];

const exportAccessLogs = (elasticUrl, microServiceName, brand_name, cs_env, batchSize = 10, TIMEZONE = "Asia/Calcutta") => {
    return function (req, res, next) {
        try {
            const requestStart = Date.now();
            res.on('finish', () => {
                let processingTime = Date.now() - requestStart;
                let date = momentTimezone().tz(TIMEZONE).startOf('day').format('YYYY-MM-DD');
                let dateTime = momentTimezone().tz(TIMEZONE).format();
                const { method, url } = req;
                let logObject = {
                    processingTime,
                    method,
                    url,
                    statusCode: res.statusCode,
                    logDate: date,
                    logDateTime: dateTime,
                    "@timestamp": dateTime
                };
                if (elasticUrl) {
                    if (incomingRequestBatch.length >= batchSize) {
                        let index = microServiceName + '_' + brand_name + '_' + cs_env + '_access_logs';
                        bulkIndex(incomingRequestBatch, index, elasticUrl);
                        incomingRequestBatch = [];
                    }
                    incomingRequestBatch.push(logObject);
                }
            });
            next();
        } catch (err) {
        }
    }
}

module.exports = {
    exportAccessLogs
}
