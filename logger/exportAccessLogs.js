let socketListenerActive = false;
const momentTimezone = require('moment-timezone');
const { shipDataToElasticsearh } = require('../utils/utilities');
const { errorHandler } = require('../utils/errorHandler');
const { defaultInitializationValues, debug } = require('../utils/constants');


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
                    events: event ? { event, arguments: (data && typeof (data) == "object") ? data : data ? { data } : { data: "no event data" } } : {},
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

const exportAccessLogs = ({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', ship = false }) => {
    return (req, res, next) => {
        try {
            const requestStart = Date.now();
            res.on('finish', () => {
                try {
                    const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
                    const dateTime = momentTimezone().tz(timezone).format();

                    const log = morphAccessLogs({ type: 'http-access', req, res, date, dateTime, requestStart, microServiceName });

                    // if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nAccessLog: ', log, '\n');
                    if (ship) shipDataToElasticsearh({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });

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
 * @param {string=} [a.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [a.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [a.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 *
 */

const exportSocketAccessLogs = ({ microServiceName, namespaces = ['/'], brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', ship = false, logEvents = true, eventsToLog = ['disconnect'] }) => {
    return (socket, next) => {
        try {
            const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
            const dateTime = momentTimezone().tz(timezone).format();
            const log = morphAccessLogs({ type: 'socket-access', socket, date, dateTime, microServiceName });

            // if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocketLog: ', log, '\n');

            if (logEvents /*&& !socketListenerActive*/) {
                namespaces.forEach(nsp => {
                    nsp.on('connection', async (socket) => {
                        setupSocketListerners({ socket, eventsToLog, microServiceName, timezone });
                    });
                });
            }

            // if (ship) shipDataToElasticsearh({ log, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'access' });
            next();
        } catch (err) {
            errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.exportSocketAccessLogs' });
            return (socket, next) => { next() };
        }
    };
};

const setupSocketListerners = async ({ socket, eventsToLog = ['disconnect'], microServiceName, timezone }) => {
    try {
        const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
        const dateTime = momentTimezone().tz(timezone).format();

        eventsToLog.forEach(event => {
            socket.on(event, (data, callback) => {
                console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocket event received: ', event, '\n', 'with arguments: ', data, '\n');
                const log = morphAccessLogs({ type: 'socket-access', socket, event, data, date, dateTime, microServiceName });
                console.log('\nLISTERNER ADDED FOR EVENT: ', event, '\n');
                if (debug) console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocketLogWithEvent: ', log, '\n');
            });
        });
        // if (true) {
        //     socket.onAny((event, args) => { //requires socket.io v3
        //         console.log('\n ON ANY LISTENER \n\n');
        //         console.log('\n<><><><><><><><><><><><><><><><> DEBUG <><><><><><><><><><><><><><><><>\nSocket event received inside ON ANY: ', event, '\n', 'with arguments: ', args, '\n');
        //     });
        // }
        socketListenerActive = true;
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.setupSocketListerners' });
        socketListenerActive = false;
    }
};

module.exports = {
    exportAccessLogs, exportSocketAccessLogs
};