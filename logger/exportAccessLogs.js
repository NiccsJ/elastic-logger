const momentTimezone = require('moment-timezone');
const { shipDataToElasticsearch } = require('../utils/utilities');
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

const morphAccessLogs = ({ type, socket, event, data, req, res, date, dateTime, requestStart, microServiceName }) => {
    let log = {};
    try {
        switch (type) {
            case 'http-access': {
                let { headers, httpVersion, method, socket, url, originalUrl } = req;
                let { remoteAddress, remoteFamily } = socket;
                let { statusCode, statusMessage } = res;
                let processingTime = Date.now() - requestStart;
                log = {
                    url: (url == '/') ? originalUrl : url,
                    method,
                    headers,
                    remoteAddress,
                    remoteFamily,
                    statusCode,
                    statusMessage,
                    processingTime,
                    logType: 'accessLogs',
                };
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
 * @param {object} [a = This Defaults to values from `initialisation` object if specified else from `constants.js`] - an Object that has 5 properties.
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 *
 */

const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', ship = true }) => {
    return (req, res, next) => {
        try {
            const requestStart = Date.now();
            res.on('finish', () => {
                try {
                    const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                    const dateTime = momentTimezone().tz(timezone).format();
                    const log = morphAccessLogs({ type: 'http-access', req, res, date, dateTime, requestStart, microServiceName });
                    // if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nAccessLog: ', log, '\n');
                    if (ship) shipDataToElasticsearch({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });
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

/**
 * Initiates the `incoming socket access` logger
 * @param {object} [a = This Defaults to values from `initialisation` object if specified else from `constants.js`] - an Object that has 5 properties.
 * @param {array} [a.namespaces] - (Required) List of socket.io namespace objects.
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 * @param {array} [a.eventsToLog] - (Optional) List of custom socket events to listen to.
 *
 */

const exportSocketAccessLogs = async ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', ship = true, namespaces = [], eventsToLog = [] }) => {
    try {
        eventsToLog.unshift(...defaultSocketEventsToListen);
        if (!(namespaces.length > 0)) throw new elasticError({ name: 'Initialization failed:', message: `exportSocketAccessLogs: 'namespaces' argument missing`, type: 'elastic-logger', status: 999 });
        namespaces.forEach(async nsp => {
            nsp.on('connection', async socket => {
                if (debug) console.log(`\n <><><><><><><> INITIAL CONNECTION EVENT, SOCKET ID: ${socket.id} <><><><><><><><><><><><> \n`);
                setupSocketListeners({ microServiceName, brand_name, cs_env, batchSize, timezone, ship, eventsToLog, socket });
                const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                const dateTime = momentTimezone().tz(timezone).format();
                const log = morphAccessLogs({ type: 'socket-access', socket, date, dateTime, microServiceName });
                // if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocketLog: ', log, '\n');
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
                if (debug) console.log(`\n <><><><><><><> SOCKET EVENT RECEIVED, SOCKET ID: ${socket.id}, EVENT: ${event}, ARGS: ${data} <><><><><><><><><><><><> \n`);
                const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                const dateTime = momentTimezone().tz(timezone).format();
                const log = morphAccessLogs({ type: 'socket-access', socket, event, data, date, dateTime, microServiceName });
                // if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocketLogWithEvent: ', log, '\n');
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