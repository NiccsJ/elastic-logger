let url;
const momentTimezone = require('moment-timezone');
const { errorHandler, elasticError } = require('../utils/errorHandler');
const { shipDataToElasticsearch, getLogBody, patchObjectDotFunctions, isObjEmpty } = require('../utils/utilities');
const { debug } = require('../utils/constants');

const generateLogObject = (data, type, error, additionalData) => {
    const logObject = {};
    try {
        switch (type) {
            case 'req':
                {
                    logObject.requestStart = additionalData.requestStart;
                    logObject.protocol = data.protocol || '';
                    logObject.href = data.protocol + '//' + ((data.port && !(data.port == '443' || data.port == '80')) ? (data.hostname + ':' + data.port + data.path) : (data.hostname + data.path)) || data.href;
                    logObject.href1 = data.protocol + '//' + (data.href ? data.href : (data.port && !(data.port == '443' || data.port == '80')) ? (data.hostname + ':' + data.port + data.path) : (data.hostname + data.path));
                    logObject.method = data.method || '';
                    logObject.host = data.host ? data.host : data.hostname;
                    logObject.hostname = data.hostname || '';
                    logObject.port = data.port || null;
                    logObject.headers = { ...additionalData.requestHeaders } || {};
                    logObject.query = data.query || null;
                    logObject.pathname = data.pathname || '';
                    logObject.path = data.path || '';
                    logObject.body = getLogBody(logObject.headers, additionalData.requestBody, additionalData.statusCode);
                    if (error) logObject.error = {
                        name: error.toString() || '',
                        errno: error.errno || null,
                        code: error.code || '',
                        syscall: error.syscall || '',
                        hostname: error.hostname || ''
                    };
                    break;
                }
            case 'res':
                {
                    logObject.headers = data.headers || {};
                    logObject.statusCode = data.statusCode || null;
                    logObject.statusMessage = data.statusMessage || '';
                    logObject.httpVersion = data.httpVersion || '';
                    logObject.responseSize = additionalData.responseSize || null;
                    logObject.body = getLogBody({ ...additionalData.requestHeaders }, additionalData.responseBody, data.statusCode);
                    if (error) logObject.error = {
                        name: error.toString() || '',
                        errno: error.errno || null,
                        code: error.code || '',
                        syscall: error.syscall || '',
                        hostname: error.hostname || ''
                    };
                    break;
                }
            default:
                {
                    logObject.some = 'value';
                }
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.generateLogObject' });
    }
    return logObject;
};

const overwriteHttpProtocol = async ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', elasticUrl = process.env.elasticUrl, kibanaUrl = process.env.kibanaUrl, ship = true }) => {
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
                object.request = function (options, callback) {
                    try {
                        const requestStart = Date.now();
                        let responseBody;
                        let requestBody;
                        let responseSize = -1;
                        let returnFromRequestClose = false;
                        let requestLogObject = {};
                        let responseLogObject = {};

                        const req = original(options, callback);  //OutgoingMessage (ClientRequest)

                        const ipPorts = urls.map(url => { return url.split("//")[1] });
                        const ips = ipPorts.map(ipPort => { return ipPort.split(":")[0] });
                        const hostname = (options && options.href) ? options.href : (options && options.hostname) ? options.hostname : null;

                        if (hostname && !ips.includes(hostname)) {
                            if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Hostname: ', hostname, '\nElastic-Kibana IPs/URLs: ', ips, '\n<><><><> DEBUG <><><><>\n');
                            const bodyArray = [];
                            patchObjectDotFunctions('write', bodyArray, req, 'req');
                            patchObjectDotFunctions('end', bodyArray, req, 'req');

                            req.on('finish', () => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Finish \n<><><><> DEBUG <><><><>\n');
                                requestBody = req.reqBody ? req.reqBody : null;
                                if (!requestLogObject || isObjEmpty(requestLogObject)) requestLogObject = generateLogObject(options, 'req', null, { requestStart, requestBody, requestHeaders: req.getHeaders() });
                            });

                            req.on('response', (res) => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Response \n<><><><> DEBUG <><><><>\n');
                                console.time('======= start =======');
                                const { statusCode } = res;
                                options.statusCode = statusCode;
                                // if (res.headers && res.headers['content-length']) responseSizeHeaders = Number(res.headers['content-length']);

                                const chunks = [];
                                res.on('data', (data) => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse Data \n<><><><> DEBUG <><><><>\n');
                                    // if (data && Buffer.isBuffer(data)) {
                                    if (data) {
                                        responseSize += data.length;
                                        chunks.push(Buffer.from(data));
                                        delete data;
                                    }
                                });

                                res.on('end', (data) => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse End \n<><><><> DEBUG <><><><>\n');
                                    // if (data && Buffer.isBuffer(data)) {
                                    if (data) {
                                        responseSize += data.length;
                                        chunks.push(Buffer.from(data));
                                    }
                                    responseBody = Buffer.concat(chunks).toString('utf8');
                                    console.log('RES CHUNK: ', data, 'RES BODY:', responseBody); //disable later
                                });

                                // res.on('error', (error) => {
                                //     if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse Error: ', error, '\n<><><><> DEBUG <><><><>\n');
                                // });

                                res.on('close', () => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse Close \n<><><><> DEBUG <><><><>\n');
                                    responseLogObject = generateLogObject(res, 'res', null, { responseSize, responseBody, requestHeaders: req.getHeaders() });

                                    //skip when headers contain transfer-encoding: 'chunked'
                                    outBoundApiLogger({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone, ship });
                                    returnFromRequestClose = false;
                                });
                                console.timeEnd('======= start =======');
                            });

                            req.on('error', (error) => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Error: ', error, '\n<><><><> DEBUG <><><><>\n');
                                requestBody = requestBody ? requestBody : req.reqBodytempBuffer ? Buffer.concat(req.reqBodytempBuffer).toString('utf8') : null;
                                responseLogObject = generateLogObject({}, 'res', error, { requestHeaders: req.getHeaders() });
                                requestLogObject = generateLogObject(options, 'req', error, { requestStart, requestBody, requestHeaders: req.getHeaders() });
                                returnFromRequestClose = true;
                            });

                            req.on('close', () => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Close \n<><><><> DEBUG <><><><>\n');

                                //conditional return in case of error, else returns from res.close
                                if (returnFromRequestClose) outBoundApiLogger({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone, ship });
                                returnFromRequestClose = false;
                            });
                        }

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

const outBoundApiLogger = async ({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone, ship = true }) => {
    try {
        // if(debug) console.log(`<><><> outBoundApiLogger: FINAL REQUEST LOG OBJECT: `, requestLogObject, ` <><><>`);
        // if(debug) console.log(`<><><> outBoundApiLogger: FINAL RESPONSE LOG OBJECT: `, responseLogObject, ` <><><>`);

        let { href, headers, method, requestStart } = requestLogObject;
        const { statusCode, responseSize, statusMessage, httpVersion } = responseLogObject;
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
            httpVersion,
            method,
            processingTime,
            headers,
            statusCode,
            statusMessage,
            responseSize,
            request: requestLogObject,
            response: responseLogObject,
            microService: microServiceName ? microServiceName : 'default',
            logType: 'apiLogs',
            logDate: date,
            "@timestamp": dateTime,
        };

        if (debug) console.log('\n<><><><> DEBUG <><><><>\nOutgoingLog: ', log, '\n<><><><> DEBUG <><><><>\n');
        if (ship) shipDataToElasticsearch({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'api' });
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.outBoundApiLogger' });
    }
};

module.exports = {
    overwriteHttpProtocol
};