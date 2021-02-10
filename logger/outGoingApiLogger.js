let outgoingRequestBatch = [];
const momentTimezone = require('moment-timezone');
const { bulkIndex } = require('../utils/elasticHandler/elasticApi');
const { errorHandler, elasticError } = require('../utils/errorHandler');


const outBoundApiLogger = (href, requestStart, statusCode, elasticUrl, microServiceName, brand_name, cs_env, batchSize) => {
    try {
        let processingTime = Date.now() - requestStart;
        const NUMERIC_REGEXP = /[4-9]{1}[0-9]{9}/g;
        if (href) {
            let hrefComponents = href.split('/');
            let lastComponent = hrefComponents[hrefComponents.length - 1];
            let isPhoneNumber = lastComponent.replace(/\s/g, '').match(NUMERIC_REGEXP);
            if (isPhoneNumber) {
                let newHref = '';
                hrefComponents.map((component, index) => {
                    if (index !== hrefComponents.length - 1) {
                        newHref += component + '/';
                    }
                });
                href = newHref;
            }
        }

        let date = momentTimezone().tz(TIMEZONE).startOf('day').format('YYYY-MM-DD');
        let dateTime = momentTimezone().tz(TIMEZONE).format();
        let logObject = {
            processingTime,
            url: href,
            statusCode: statusCode,
            logDate: date,
            // logDateTime: dateTime,
            "@timestamp": dateTime,
        };
        if (elasticUrl) {
            outgoingRequestBatch.push(logObject);
            if (outgoingRequestBatch.length >= batchSize) {
                let index = microServiceName + '_' + brand_name + '_' + cs_env + '_external_api';
                bulkIndex(outgoingRequestBatch, index, elasticUrl);
                outgoingRequestBatch = [];
            }
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.outBoundApiLogger' });
    }
}

module.exports = {
    outBoundApiLogger
}

        // const patch = (object) => {
        //     const original = object.request;
        //     object.request = (options, callback) => {
        //         const requestStart = Date.now();

        //         let newCallback = function () {
        //             let res = arguments[0];
        //             let urlArray1 = elasticUrl.split("//");
        //             let urlArray2 = urlArray1[1].split(":");
        //             let hostname = urlArray2[0];
        //             if (options && options.hostname !== hostname) {
        //                 let href = options.href ? options.href : options.hostname + options.path;
        //                 outBoundApiLogger(href, requestStart, res.statusCode, elasticUrl, microServiceName, brand_name, cs_env, batchSize);
        //             }
        //             if (callback) {
        //                 callback.apply(this, arguments);
        //             }
        //         }
        //         let req = original(options, newCallback);
        //         return req;
        //     }
        // }