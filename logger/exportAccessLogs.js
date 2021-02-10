let incomingRequestBatch = [];
const momentTimezone = require('moment-timezone');
const { bulkIndex } = require('../utils/elasticHandler/elasticApi');
const { checkSuppliedArguments } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');


//to-do add  a way for argument validation
const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta' }) => {
    return function (req, res, next) {
        try {  
            res.on('finish', () => {
                const requestStart = Date.now();
                const { headers, httpVersion, method, socket, url } = req;
                const { remoteAddress, remoteFamily } = socket; 
                const { statusCode, statusMessage } = res;
                const headers = response.getHeaders();
                const processingTime = Date.now() - requestStart;
                const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                const dateTime = momentTimezone().tz(timezone).format();
                const logObject = { // move to a separate parser
                    url,
                    method,
                    headers,
                    remoteAddress,
                    remoteFamily,
                    statusCode,
                    statusMessage,
                    processingTime,
                    // reqOrigin: (req['headers'] && req['headers']['host']) ? req['headers']['host'] : undefined,
                    // reqAgent: (req['headers'] && req['headers']['user-agent']) ? req['headers']['user-agent'] : undefined,
                    // logDateTime: dateTime,
                    logDate: date,
                    "@timestamp": dateTime
                };
                console.log('logObject------------->', logObject);
                incomingRequestBatch.push(logObject);
                if (incomingRequestBatch.length >= batchSize) {
                    let index = brand_name + '_' + microServiceName + '_' + cs_env + '_access_logs';
                    bulkIndex(incomingRequestBatch, index);
                    incomingRequestBatch = [];
                }
            });
            next();
        } catch (err) {
            errorHandler({ err, ship: true, scope: '@niccsj/elastic-logger.exportAccessLogs' });
            next();
        }
    }
}

module.exports = {
    exportAccessLogs
}
