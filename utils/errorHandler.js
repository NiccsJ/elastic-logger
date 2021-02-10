const momentTimezone = require('moment-timezone');

class elasticError extends Error {
    constructor({ name, message, type = 'nodejs', status }) {
        super(message);
        this.name = name;
        this.status = status;
        this.type = type;
    };
};

class elasticLogger extends elasticError {
    constructor({ name, message, type = 'nodejs', status }) {
        super({ name, message, type , status });

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

const morphError = async ({ err, date, dateTime, ship = false, status = null, scope }) => {
    try {
        let errObj = {};
        //nodesjs
        if (err && err.stack) {
            errObj = {
                name: err.name ? err.name : null,
                message: err.message ? err.message : err.stack.split("\n")[0],
                description: err.stack,
                status: status ? status : null,
                scope: scope ? scope : null,
                type: err.type ? err.type : null,
                // logType: 'nodejs',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: true
            };
        } else if (err.response && err.response.data) {
            errObj = {
                name: err.name ? err.name : null,
                type: (err.response.data.error && err.response.data.error.type) ? err.response.data.error.type : err.response.data.error ? err.response.data.error : err.type ? err.type : null,
                reason: (err.response.data.error && err.response.data.error.reason) ? err.response.data.error.reason : null,
                url: (err.response.config && err.response.config.url) ? err.response.config.url : null,
                errorHeader: (err.response.data.error && err.response.data.error.header) ? err.response.data.error.header : null,
                status: err.response.status ? err.response.status : err.response.data.status ? err.response.data.status : null,
                statusText: err.response.statusText ? err.response.statusText : null,
                allowedMethod: err.response.headers ? err.response.headers.allow : null,
                scope: scope ? scope : null,
                // logType: 'axios',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: true
            };
        } else {
            errObj = {
                name: err.name ? err.name : null,
                message: err,
                description: 'Unable to parse error',
                status: status ? status : 0,
                scope: scope ? scope : null,
                type: err.type ? err.type : null,
                // logType: 'nodejs',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: false
            };
        }
        return errObj;
    } catch (err) {
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.handleNodeError' });
    }

};

const errorHandler = async ({ err, ship = true, self = false, timezone = 'Asia/Calcutta', scope = '@niccsj/elastic-logger', status = null }) => {
    try {
        console.log('ship, self, timezone, scope', ship, self, timezone, scope);
        if (self) { //gaurd clause
            console.error('errrrrrr-------->', err);
            return;
        }
        const TIMEZONE = timezone;
        const date = momentTimezone().tz(TIMEZONE).startOf('day').format('YYYY-MM-DD');
        const dateTime = momentTimezone().tz(TIMEZONE).format();
        const morphedError = {};
        morphedError.main = '<-----@niccsj/elastic-logger: errorHandler----->';
        morphedError.data = await morphError({ err, date, dateTime, ship, status, scope });
        console.error('\n' + JSON.stringify(morphedError) + '\n');

        if (ship) { //should be able to ship when invoked from catch as well.
            console.log('<-----shipping this log to es----->');
            return morphedError.data;
        }

    } catch (err) {
        errorHandler({ err, ship: false, self: true, scope: '@niccsj/elastic-logger.errorHandler' });
    }
};

module.exports = {
    errorHandler,
    elasticError
};