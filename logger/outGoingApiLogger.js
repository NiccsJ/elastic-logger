let url;
const momentTimezone = require('moment-timezone');
const { errorHandler, elasticError } = require('../utils/errorHandler');
const { shipDataToElasticsearh } = require('../utils/utilities');
const { debug } = require('../utils/constants');

const overwriteHttpProtocol = async ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', elasticUrl = process.env.elasticUrl, kibanaUrl = process.env.kibanaUrl }) => {
    try {
        url = elasticUrl;
        if (!url) throw new elasticError({ name: 'Initialization failed:', message: `overwriteHttpProtocol: 'elasticUrl' argument missing`, type: 'elastic-logger', status: 999 });
        const urls = url.split(',');
        if (kibanaUrl) urls.push(kibanaUrl);
        const httpObj = require('http');
        const httpsObj = require('https');
        const patch = (object) => {
            try {
                const original = object.request;
                object.request = (options, callback) => {
                    try {
                        const requestStart = Date.now();
                        function newCallback() {
                            try {
                                let responseSize = -1;
                                const requestLogObject = {};
                                const responseLogObject = {};
                                const res = arguments[0];
                                const ipPorts = urls.map(url => { return url.split("//")[1] });
                                const ips = ipPorts.map(ipPort => { return ipPort.split(":")[0] });
                                const hostname = (options && options.href) ? options.href : (options && options.hostname) ? options.hostname : null;
                                if (hostname && !ips.includes(hostname)) {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Hostname: ', hostname, '\nElastic-Kibana IPs/URLs: ', ips, '\n');
                                    if (res.headers && res.headers['content-length']) {
                                        responseSize = Number(res.headers['content-length']);
                                    } else {
                                        res.on('data', (data) => {
                                            if (data && Buffer.isBuffer(data)) {
                                                responseSize += data.length;
                                                delete data;
                                            }
                                        });
                                    }
                                    res.on('close', () => {
                                        requestLogObject.href = options.href ? options.href : options.hostname + options.path;
                                        requestLogObject.headers = options.headers ? options.headers : {};
                                        requestLogObject.requestStart = requestStart;

                                        responseLogObject.statusCode = res.statusCode;
                                        responseLogObject.headers = res.headers;
                                        responseLogObject.responseSize = responseSize;
                                        //skip when headers contain transfer-encoding: 'chunked'
                                        outBoundApiLogger({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone });
                                    });
                                }
                                if (callback) {
                                    callback.apply(this, arguments);
                                }
                            } catch (err) {
                                errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol.patch.object.request.newCallback' });
                            }
                        };
                        const req = original(options, newCallback);
                        return req;
                    } catch (err) {
                        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol.patch.object.request' });
                        return req;
                    }
                };
            } catch (err) {
                errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol.patch' });
            }
        };

        patch(httpObj);
        patch(httpsObj);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol' });
    }
};

const outBoundApiLogger = async ({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone }) => {
    try {
        let { href, headers, requestStart } = requestLogObject;
        const { statusCode, responseSize } = responseLogObject;
        const processingTime = Date.now() - requestStart;
        const NUMERIC_REGEXP = /[4-9]{1}[0-9]{9}/g;
        if (href) {
            const hrefComponents = href.split('/');
            const lastComponent = hrefComponents[hrefComponents.length - 1];
            const isPhoneNumber = lastComponent.replace(/\s/g, '').match(NUMERIC_REGEXP);
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

        const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
        const dateTime = momentTimezone().tz(timezone).format();
        const log = {
            url: href,
            processingTime,
            headers,
            statusCode,
            responseSize,
            response: responseLogObject,
            microService: microServiceName ? microServiceName : 'default',
            logType: 'apiLogs',
            logDate: date,
            "@timestamp": dateTime,
        };

        if (debug) console.log('\n<><><><> DEBUG <><><><>\nOutgoingLog: ', log, '\n');
        shipDataToElasticsearh({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'api' });
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.outBoundApiLogger' });
    }
};

module.exports = {
    overwriteHttpProtocol
};