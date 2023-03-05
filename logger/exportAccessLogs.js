const is = require('type-is');
const momentTimezone = require('moment-timezone');
const { shipDataToElasticsearch, getLogBody, patchObjectDotFunctions } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');
const { defaultInitializationValues, defaultSocketEventsToListen, debug } = require('../utils/constants');

const adapterLogBody = (client) => {
    try {
        return {
            address: client.address,
            connection_id: client.connection_id,
            connected: client.connected,
            ready: client.ready,
        }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.adapterLogBody' });
        return { error: 'unable to fetch adapter log body' };
    }
};

const extractQueryParams = (originalUrl) => {
    const params = {}; const temp = originalUrl.split('?');
    const url = temp[0]; const string = temp[1];
    if (!string) return { url, params };
    string.split('&').forEach(p => { const temp = p.split('='); params[temp[0]] = temp[1]; });
    return { params, url };
};

const morphAccessLogs = ({ type, socket, event, data, req, res, date, dateTime, requestStart, microServiceName }) => {
    let log = {};
    try {
        switch (type) {
            case 'http-access': {
                const { headers, httpVersion, method, socket, url, originalUrl, bodySize: requestSize, reqBody, maxHttpLogBodyLength: reqMaxBodySize, truncated: reqTruncated } = req; //IncomingMessage (ClientRequest)
                const { remoteAddress, remoteFamily } = socket;
                const { resBody, statusCode, statusMessage, bodySize: responseSize, maxHttpLogBodyLength: resMaxBodySize, truncated: resTruncated } = res; //OutgoingMessage (ServerResponse)
                const resHeaders = res.getHeaders();
                const processingTime = Date.now() - requestStart;
                const reqUrl = extractQueryParams(originalUrl);

                log = {
                    url: `${req.protocol}://${req.get('host')}${reqUrl.url}`,
                    httpVersion,
                    method,
                    headers,
                    queryParams: reqUrl.params,
                    remoteAddress,
                    remoteFamily,
                    statusCode,
                    statusMessage,
                    processingTime,
                    requestSize,
                    responseSize,
                    request: {
                        url: `${req.protocol}://${req.get('host')}${reqUrl.url}`,
                        method,
                        headers,
                        queryParams: reqUrl.params,
                        bodySize: requestSize,
                        maxBodySize: reqMaxBodySize || null,
                        truncated: reqTruncated ?? null
                    },
                    response: {
                        headers: resHeaders ? { ...resHeaders } : {},
                        statusCode,
                        statusMessage,
                        bodySize: responseSize,
                        maxBodySize: resMaxBodySize || null,
                        truncated: resTruncated ?? null
                    },
                    logType: 'accessLogs',
                };
                log.request.body = getLogBody(log.request.headers, reqBody, statusCode, 'req');
                log.response.body = getLogBody(log.request.headers, resBody, statusCode, 'res');

                break;
            }
            case 'socket-access': {
                let { handshake, request, nsp, id } = socket;
                let { headers, method, url, originalUrl, res } = request;
                let { statusCode, statusMessage } = res;
                let { name, server, adapter } = nsp;
                let { pubClient, subClient } = adapter;
                log = {
                    id,
                    url: (url == '/') ? originalUrl : url,
                    method,
                    headers,
                    namespace: { name, allNamespaces: Object.keys(server.nsps) },
                    handshake,
                    adapter: { publisher: adapterLogBody(pubClient), subscriber: adapterLogBody(subClient) },
                    events: event ? { event, arguments: (data && typeof (data) == "object") ? data : data ? { data } : { data: "no event data" } } : { event: 'new connection', arguments: { data: 'none' } },
                    statusCode,
                    statusMessage,
                    logType: 'socketLogs',
                };
                break;
            }
            default:
                console.log('Default case invoked in morphAccessLogs: ', type);
                break;
        };

        log["microService"] = microServiceName ? microServiceName : (defaultInitializationValues && defaultInitializationValues.microServiceName) ? defaultInitializationValues.microServiceName : 'default';
        log["logDate"] = date;
        log["@timestamp"] = dateTime;

        return log;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.morphAccessLogs' });
        return log;
    }
};

/**
 * Initiates the `incoming access` logger
 * @param {object} [a = This Defaults to values from `initialization` object if specified else from `constants.js`] - an Object that has 5 properties.
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialization object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialization object if specified else constants.js
 *
 */

const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', maxHttpLogBodyLength, ship = true }) => {
    try {
        return (req, res, next) => {
            try {
                // if (is(req, ['multipart'])) return next();
                const requestStart = Date.now();
                const resBodyArray = [];
                const reqBodyArray = [];
                // patchObjectDotFunctions('send', res, 'res', null);

                patchObjectDotFunctions('write', res, 'res', resBodyArray, maxHttpLogBodyLength, null, false);
                patchObjectDotFunctions('end', res, 'res', resBodyArray, maxHttpLogBodyLength, null, true);

                if (!is(req, ['multipart'])) { //work-around to handle "multer": "^1.4.2" not being to generate file if these event listeners are added.
                    req.on('data', (chunk) => {
                        if (debug) console.log('\n<><><><> DEBUG <><><><>\nAccess Request Data \n<><><><> DEBUG <><><><>\n');
                        patchObjectDotFunctions('assemble', req, 'req', reqBodyArray, maxHttpLogBodyLength, chunk, false);
                    });
                    req.on('end', (chunk) => {
                        if (debug) console.log('\n<><><><> DEBUG <><><><>\nAccess Request End \n<><><><> DEBUG <><><><>\n');
                        patchObjectDotFunctions('assemble', req, 'req', reqBodyArray, maxHttpLogBodyLength, chunk, true);
                    });
                }

                res.on('finish', () => {
                    try {
                        if (debug) console.log('\n<><><><> DEBUG <><><><>\nAccess Response Finish \n<><><><> DEBUG <><><><>\n');
                        const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                        const dateTime = momentTimezone().tz(timezone).format();
                        const log = morphAccessLogs({ type: 'http-access', req, res, date, dateTime, requestStart, microServiceName });
                        if (debug) console.log('\n<><><><> DEBUG <><><><>\nAccessLog: ', JSON.stringify(log, null, 4), '\n<><><><> DEBUG <><><><>\n');
                        if (ship) shipDataToElasticsearch({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });
                    } catch (err) {
                        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportAccessLogs.res.on.finish' });
                        return next();
                    }
                });

                return next();
            } catch (err) {
                errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportAccessLogs.return' });
                return next();
            }
        };
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportAccessLogs' });
        return (req, res, next) => { next() };
    }
};

/**
 * Initiates the `incoming socket access` logger
 * @param {object} [a = This Defaults to values from `initialization` object if specified else from `constants.js`] - an Object that has 5 properties.
 * @param {array} [a.namespaces] - (Required) List of socket.io namespace objects.
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialization object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialization object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialization object if specified else constants.js
 * @param {array} [a.eventsToLog] - (Optional) List of custom socket events to listen to.
 *
 */

const exportSocketAccessLogs = async ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', ship = true, namespaces = [], eventsToLog = [] }) => {
    try {
        eventsToLog.unshift(...defaultSocketEventsToListen);
        if (!(namespaces.length > 0)) throw new elasticError({ name: 'Initialization failed:', message: `exportSocketAccessLogs: 'namespaces' argument missing`, type: 'elastic-logger', status: 999 });
        namespaces.forEach(async nsp => {
            nsp.on('connection', async socket => {
                if (debug) console.log('\n <><><><> DEBUG <><><><>\nINITIAL CONNECTION EVENT, SOCKET ID: ', socket.id, '\n<><><><> DEBUG <><><><>\n');
                setupSocketListeners({ microServiceName, brand_name, cs_env, batchSize, timezone, ship, eventsToLog, socket });
                const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                const dateTime = momentTimezone().tz(timezone).format();
                const log = morphAccessLogs({ type: 'socket-access', socket, date, dateTime, microServiceName });
                // if (debug) console.log('\n<><><><> DEBUG <><><><>\nSocketLog: ', log, '\n<><><><> DEBUG <><><><>\n');
                if (ship) shipDataToElasticsearch({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });
            });
        });
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportSocketAccessLogs' });
    }
};

const setupSocketListeners = async ({ microServiceName, brand_name, cs_env, batchSize, timezone, ship, eventsToLog, socket }) => {
    try {
        eventsToLog.forEach(async event => {
            socket.on(event, async (data, callback) => {
                if (debug) console.log('\n <><><><> DEBUG <><><><>\nSOCKET EVENT RECEIVED, SOCKET ID: ', socket.id, ' EVENT: ', event, ' ARGS: ', data, '\n<><><><> DEBUG <><><><>\n');
                const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                const dateTime = momentTimezone().tz(timezone).format();
                const log = morphAccessLogs({ type: 'socket-access', socket, event, data, date, dateTime, microServiceName });
                // if (debug) console.log('\n<><><><><> DEBUG <><><><>\nSocketLogWithEvent: ', log, '\n<><><><> DEBUG <><><><>\n');
                if (ship) shipDataToElasticsearch({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });
            });
        });
        // if (true) {
        //     socket.onAny((event, args) => { //requires socket.io v3
        //         console.log('\n ON ANY LISTENER \n\n');
        //         console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocket event received inside ON ANY: ', event, '\n', 'with arguments: ', args, '\n');
        //     });
        // }
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setupSocketListeners' });
    }
};

module.exports = {
    exportAccessLogs, exportSocketAccessLogs
};

/*
Referrences
https://www.moesif.com/blog/technical/logging/How-we-built-a-Nodejs-Middleware-to-Log-HTTP-API-Requests-and-Responses/
https://thewebdev.info/2022/03/06/how-to-log-the-response-body-with-express/
https://stackoverflow.com/questions/19215042/express-logging-response-body
*/