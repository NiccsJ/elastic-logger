let shipDataToElasticsearh;
const { defaultInitializationValues } = require('./constants');
const momentTimezone = require('moment-timezone');

class elasticError extends Error {
    constructor({ name, message, type = 'nodejs', status }) {
        super(message);
        this.name = name;
        this.status = status;
        this.type = type;
    };
};

class dynamicError extends elasticError {
    constructor({ name, message, metadata, type = 'elasticsearch', status }) {
        super({ name, message, type, status });
        this.metadata = metadata;
    };
}

const handleAxiosErrors = async ({ err, date, dateTime, ship = false, scope }) => {
    try {
        let errObj = {};
        if (err.response && err.response.data) {
            errObj = {
                type: (err.response.data.error && err.response.data.error.type) ? err.response.data.error.type : err.response.data.error ? err.response.data.error : null,
                reason: (err.response.data.error && err.response.data.error.reason) ? err.response.data.error.reason : null,
                url: (err.response.config && err.response.config.url) ? err.response.config.url : null,
                errorHeader: (err.response.data.error && err.response.data.error.header) ? err.response.data.error.header : null,
                status: err.response.status ? err.response.status : err.response.data.status ? err.response.data.status : null,
                statusText: err.response.statusText ? err.response.statusText : null,
                allowedMethod: err.response.headers ? err.response.headers.allow : null,
                scope: scope ? scope : null,
                logType: 'axios',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: true
            };
        } else {
            errObj = {
                message: err,
                description: 'Unable to parse axios error',
                status: '',
                type: '',
                reason: '',
                scope: scope ? scope : null,
                logType: 'axios',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: false
            };
        }
        return errObj;
    } catch (err) {
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.handleAxiosErrors' });
    }
};

const morphError = async ({ err, microServiceName, date, dateTime, status, scope = null, metadata }) => {
    try {
        let errObj = {};
        if (err && err.stack) {
            errObj['name'] = err.name ? err.name : null;
            errObj['message'] = err.message ? err.message : err.stack.split("\n")[0];
            errObj['description'] = err.description ? err.description : err.stack ? err.stack : 'none';
            errObj['meta'] = err.meta ? err.meta : null;
            errObj['status'] = err.status ? err.status : status ? status : null;
            errObj['scope'] = err.scope ? err.scope : null;
        } else if (err.response && err.response.data) {
            errObj['name'] = err.name ? err.name : null;
            errObj['type'] = (err.response.data.error && err.response.data.error.type) ? err.response.data.error.type : err.response.data.error ? err.response.data.error : null;
            errObj['reason'] = (err.response.data.error && err.response.data.error.reason) ? err.response.data.error.reason : null;
            errObj['url'] = (err.response.config && err.response.config.url) ? err.response.config.url : null;
            errObj['errorHeader'] = (err.response.data.error && err.response.data.error.header) ? err.response.data.error.header : null;
            errObj['status'] = err.response.status ? err.response.status : err.response.data.status ? err.response.data.status : null;
            errObj['statusText'] = err.response.statusText ? err.response.statusText : null;
            errObj['allowedMethod'] = err.response.headers ? err.response.headers.allow : null;
        } else {
            errObj['name'] = err.name ? err.name : null;
            errObj['message'] = err;
            errObj['description'] = 'Unable to parse error';
            errObj['status'] = status ? status : 0;
            errObj['parsed'] = false;
        }

        //common keys
        errObj['metadata'] = err.metadata ? err.metadata : metadata ? metadata : null;
        errObj['scope'] = errObj['scope'] ? errObj['scope'] : scope;
        errObj['type'] = errObj['type'] ? errObj['type'] : err.type ? err.type : null;
        errObj['microService'] = microServiceName ? microServiceName : (defaultInitializationValues && defaultInitializationValues.microServiceName ) ? defaultInitializationValues.microServiceName : 'default';
        errObj['logType'] = 'errorLogs';
        errObj['logDate'] = date;
        errObj["@timestamp"] = dateTime;
        errObj['parsed'] = errObj['parsed'] === false ? false : true;

        return errObj;

    } catch (err) {
        throw (err);
    }
};


/**
 * The `error handler`
 * @param {object} e This defaults to values from `initialisation` object if specified else from `constants.js` - an Object that has 13 properties.
 * @param {object} e.err - (Required) The error object
 * @param {string=} [e.microServiceName] - (Optional) Name of microService. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.brand_name] - (Optional) Name of brand. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.cs_env] - (Optional) The environment name. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [e.batchSize] - (Optional) Size of batch. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialisation object if specified else constants.js
 * @param {string=} [e.scope] - (Optional) Scope if any can be defined. Defaults to values from initialisation object if specified else constants.js
 * @param {number=} [e.status] - (Optional) Status code if any can be defined. Defaults to values from initialisation object if specified else constants.js
 * @param {object=} [e.metadata] - (Optional) Additional metadata to be added. Defaults to values from initialisation object if specified else constants.js
 * @param {boolean=} [e.ship = true] - (Optional) Bool to ship the log to ES. Defaults to values from initialisation object if specified else constants.js
 * @param {boolean=} [e.log = true] - (Optional) Bool to log the error on console. Defaults to values from initialisation object if specified else constants.js
 * @param {boolean=} [e.self = false] - For internal use
 * @param {boolean=} [e.exporter = false] - For internal use
 * 
 */

const errorHandler = async ({ err, ship = true, log = true, self = false, timezone = 'Asia/Calcutta', scope = '@niccsj/elastic-logger', status = null, exporter = false, batchSize, brand_name, cs_env, microServiceName, metadata }) => {
    try {
        console.log('ship, self, timezone, scope', ship, self, timezone, scope);
        const date = momentTimezone().tz(timezone).startOf('day').format('YYYY-MM-DD');
        const dateTime = momentTimezone().tz(timezone).format();

        const morphedError = {};
        morphedError.main = '<-----@niccsj/elastic-logger: errorHandler----->';
        morphedError.data = await morphError({ err, microServiceName, date, dateTime, status, scope, metadata });
        if (log) console.error('\n' + JSON.stringify(morphedError) + '\n');
        if (self) return; //return after one error from slef
        if (ship) {
            if (exporter) return morphedError.data;
            if (!shipDataToElasticsearh) shipDataToElasticsearh = require('./utilities').shipDataToElasticsearh;
            shipDataToElasticsearh({ log: morphedError.data, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'error' });
        }

    } catch (err) {
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.errorHandler' });
    }
};

module.exports = {
    errorHandler,
    elasticError,
    dynamicError
};