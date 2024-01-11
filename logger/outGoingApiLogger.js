let url;
const momentTimezone = require('moment-timezone');
const { errorHandler, elasticError } = require('../utils/errorHandler');
const { shipDataToElasticsearch, getLogBody, patchObjectDotFunctions, isObjEmpty } = require('../utils/utilities');
const { debug } = require('../utils/constants');

const convertAllKeysString = (object) => {
    const original = object;
    // if (debug) console.log('\n<><><><> DEBUG <><><><>\nObject before: ', original, '\n<><><><> DEBUG <><><><>\n');
    try {
        for (header in object) {
            if (typeof object[header] == 'string') continue;
            if (typeof object[header] != 'object') {
                object[header] = object[header].toString();
            }
        }
        // if (debug) console.log('\n<><><><> DEBUG <><><><>\nObject after: ', object, '\n<><><><> DEBUG <><><><>\n');
    } catch(err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.convertAllKeysString' });
        object = original;
    }
    return object;
};

const generateLogObject = (data, type, error, additionalData) => {
    const logObject = {};
    try {
        switch (type) {
            case 'req':
                {
                    logObject.requestStart = additionalData.requestStart;
                    logObject.protocol = data.protocol || '';
                    logObject.host = data.host ? data.host : data.hostname;
                    logObject.port = data.port || null;
                    logObject.path = data.path || '';
                    // logObject.href1 = data.protocol + '//' + data.href || ((data.port && !(data.port == '443' || data.port == '80')) ? (data.hostname + ':' + data.port + data.path) : (data.hostname + data.path));
                    logObject.href = logObject.protocol != '' ? (logObject.protocol + '//' + (data.href ? data.href : (logObject.port && !(logObject.port == '443' || logObject.port == '80')) ? (logObject.host + ':' + logObject.port + logObject.path) : (logObject.host + logObject.path))) : (data.href ? data.href : (logObject.port && !(logObject.port == '443' || logObject.port == '80')) ? (logObject.host + ':' + logObject.port + logObject.path) : (logObject.host + logObject.path));
                    logObject.method = data.method || '';
                    logObject.hostname = data.hostname || '';
                    logObject.headers = convertAllKeysString({ ...additionalData.requestHeaders }) || {};
                    logObject.query = data.query || null;
                    logObject.pathname = data.pathname || '';
                    logObject.bodySize = additionalData.requestBodySize || null;
                    // logObject.bodyByteLength = additionalData.requestBodyByteLength || null;
                    logObject.maxBodySize = additionalData.maxHttpLogBodyLength ?? null;
                    logObject.truncated = additionalData.truncated ?? null;
                    logObject.body = getLogBody(logObject.headers, additionalData.requestBody, data.statusCode ? data.statusCode : additionalData.statusCode);
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
                    logObject.bodySize = data.bodySize || null;
                    // logObject.bodyByteLength = data.bodyByteLength || null;
                    logObject.maxBodySize = data.maxHttpLogBodyLength ?? null;
                    logObject.truncated = data.truncated ?? null;
                    logObject.body = getLogBody({ ...additionalData.requestHeaders }, data.resBody, data.statusCode);
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

const overwriteHttpProtocol = async ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', maxHttpLogBodyLength, elasticUrl = process.env.elasticUrl, kibanaUrl = process.env.kibanaUrl, ship = true }) => {
    try {
        url = elasticUrl;
        if (!url) throw new elasticError({ name: 'Initialization failed:', message: `overwriteHttpProtocol: 'elasticUrl' argument missing`, type: 'elastic-logger', status: 999 });
        const urls = url.split(',');
        if (kibanaUrl) urls.push(kibanaUrl);
        // if (kibanaUrl) urls.push(Array.isArray(kibanaUrl?.split('/')) ? ...kibanaUrl?.split('/') : kibanaUrl);

        const httpObj = require('http');
        const httpsObj = require('https');
        const patch = (object) => {
            try {
                const original = object.request;
                object.request = function (options, callback) {
                    try {
                        const requestStart = Date.now();
                        let returnFromRequestClose = false;
                        let requestLogObject = {};
                        let responseLogObject = {};

                        const req = original(options, callback);  //OutgoingMessage (ClientRequest)

                        // console.log('\n<><><> URLS: ',  urls, ' <><><>\n');
                        const ipPorts = urls.map(url => { return url.split("//")[1] });
                        const ips = ipPorts.map(ipPort => { return ipPort.split(":")[0] });
                        const hostname = (options && options.href) ? options.href : (options && options.hostname) ? options.hostname : null;
                        const nullHostname = hostname ? null : options.host;

                        if (hostname && !ips.includes(hostname)) {
                            if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Hostname, Host: ', hostname, nullHostname, '\nElastic-Kibana IPs/URLs: ', ips, '\n<><><><> DEBUG <><><><>\n');
                            const reqBodyArray = [];
                            patchObjectDotFunctions('write', req, 'req', reqBodyArray, maxHttpLogBodyLength, null, false);
                            patchObjectDotFunctions('end', req, 'req', reqBodyArray, maxHttpLogBodyLength, null, true);

                            // req.on('finish', () => {
                            //     if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Finish \n<><><><> DEBUG <><><><>\n');
                            // });

                            req.on('response', (res) => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Response \n<><><><> DEBUG <><><><>\n');
                                const { statusCode } = res;
                                options.statusCode = statusCode;

                                const resBodyArray = [];
                                res.on('data', (chunk) => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse Data \n<><><><> DEBUG <><><><>\n');
                                    patchObjectDotFunctions('assemble', res, 'res', resBodyArray, maxHttpLogBodyLength, chunk, false);
                                });

                                res.on('end', (chunk) => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse End \n<><><><> DEBUG <><><><>\n');
                                    patchObjectDotFunctions('assemble', res, 'res', resBodyArray, maxHttpLogBodyLength, chunk, true);
                                });

                                res.on('close', () => {
                                    if (debug) console.log('\n<><><><> DEBUG <><><><>\nResponse Close \n<><><><> DEBUG <><><><>\n');
                                    const additionalData = {
                                        requestStart,
                                        requestBody: req.reqBody ? req.reqBody : null,
                                        requestBodySize: req.bodySize,
                                        requestBodyByteLength: req.bodyByteLength,
                                        requestHeaders: req.getHeaders(),
                                        maxHttpLogBodyLength: req.maxHttpLogBodyLength,
                                        truncated: req.truncated,
                                    };
                                    requestLogObject = generateLogObject(options, 'req', null, additionalData);
                                    responseLogObject = generateLogObject(res, 'res', null, { requestHeaders: req.getHeaders() });

                                    //skip when headers contain transfer-encoding: 'chunked'
                                    outBoundApiLogger({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone, ship });
                                    returnFromRequestClose = false;
                                });
                            });

                            req.on('error', (error) => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Error: ', error, '\n<><><><> DEBUG <><><><>\n');
                                const additionalData = {
                                    requestStart,
                                    // requestBody: requestBody ? requestBody : req.bodytempBuffer ? Buffer.concat(req.bodytempBuffer, maxHttpLogBodyLength).toString('utf8') : null,
                                    requestBody: req.reqBody ? req.reqBody : null,
                                    requestBodySize: req.bodySize,
                                    requestBodyByteLength: req.bodyByteLength,
                                    requestHeaders: req.getHeaders(),
                                    statusCode: true,
                                    maxHttpLogBodyLength: req.maxHttpLogBodyLength,
                                    truncated: req.truncated,
                                };
                                requestLogObject = generateLogObject(options, 'req', error, additionalData);
                                responseLogObject = generateLogObject({}, 'res', error, { requestHeaders: additionalData.requestHeaders });
                                returnFromRequestClose = true;
                            });

                            req.on('close', () => {
                                if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Close \n<><><><> DEBUG <><><><>\n');
                                const additionalData = {
                                    requestStart,
                                    requestBody: req.reqBody ? req.reqBody : null,
                                    requestBodySize: req.bodySize,
                                    requestBodyByteLength: req.bodyByteLength,
                                    requestHeaders: req.getHeaders(),
                                    maxHttpLogBodyLength: req.maxHttpLogBodyLength,
                                    truncated: req.truncated,
                                };
                                if (!requestLogObject || isObjEmpty(requestLogObject)) requestLogObject = generateLogObject(options, 'req', null, additionalData);

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
        let { href, headers, method, requestStart, bodySize: requestSize } = requestLogObject;
        const { statusCode, bodySize: responseSize, statusMessage, httpVersion } = responseLogObject;
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
            requestSize,
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

/*
Referrences
https://unpkg.com/browse/global-request-logger@0.1.1/index.js
*/