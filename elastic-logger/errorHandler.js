const momentTimezone = require('moment-timezone');

const handleAxiosErrors = async ({ err, date, dateTime, ship = false }) => {
    try {
        let errObj = {};
        if (err.response && err.response.data) {
            // console.log('errrrrrr---->', err.response);
            errObj = {
                type: (err.response.data.error && err.response.data.error.type) ? err.response.data.error.type : err.response.data.error ? err.response.data.error : null,
                reason: (err.response.data.error && err.response.data.error.reason) ? err.response.data.error.reason : null,
                url: (err.response.config && err.response.config.url) ? err.response.config.url : null,
                errorHeader: (err.response.data.error && err.response.data.error.header) ? err.response.data.error.header : null,
                status: err.response.status ? err.response.status : err.response.data.status ? err.response.data.status : null,
                statusText: err.response.statusText ? err.response.statusText : null,
                allowedMethod: err.response.headers ? err.response.headers.allow : null,
                logType: 'axios',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: true
            };
        } else {
            // throw Error('@niccsj/elastic-logger: Unknown axios error----->', err);
            // // console.error('@niccsj/elastic-logger: Unknown axios error----->', err);
            errObj = {
                title: err,
                description: 'Unable to parse axios error',
                status: '',
                type: '',
                reason: '',
                logType: 'axios',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: false
            };
        }
        return errObj;
    } catch (err) {
        errorHandler({ err, type: 'nodejs', ship: false, self: true, scope: '@niccsj/elastic-logger.handleAxiosErrors' });
    }
};

const handleNodeError = async ({ err, date, dateTime, ship = false, status = null, scope }) => {
    try {
        let errObj = {};
        if (err && err.stack) {
            errObj = {
                title: err.message ? err.message : err.stack.split("\n")[0],
                // message: err.message,
                description: err.stack,
                logType: 'nodejs',
                status: status ? status : null,
                scope: scope ? scope : null,
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: true
            };
        } else {
            errObj = {
                title: err,
                description: 'Unable to parse nodejs error',
                logType: 'nodejs',
                logDate: date,
                // logDateTime: dateTime,
                "@timestamp": dateTime,
                parsed: false
            };
        }
        return errObj;
    } catch (err) {
        errorHandler({ err, type: 'nodejs', ship: false, self: true, scope: '@niccsj/elastic-logger.handleNodeError' });
    }

};

const errorHandler = async ({ err, type, ship = true, self = false, timezone = 'Asia/Calcutta', scope = 'global', status = null }) => {
    try {
        console.log('type, ship, self, timezone, scope', type, ship, self, timezone, scope);
        if (self) { //gaurd clause
            return;
        }
        const TIMEZONE = timezone;
        const date = momentTimezone().tz(TIMEZONE).startOf('day').format('YYYY-MM-DD');
        const dateTime = momentTimezone().tz(TIMEZONE).format();
        let morphedError = {};
        switch (type) {
            case 'axios':
                morphedError = await handleAxiosErrors({ err, date, dateTime, ship });
                break;
            case 'nodejs':
                morphedError = await handleNodeError({ err, date, dateTime, ship, status, scope });
                // console.log('morphedNodeError--->', morphedError);
                break;
            default:
                morphedError = await handleNodeError({ err, date, dateTime, ship, status, scope });
                // console.error(`@niccsj/elastic-logger: Unhandled error type----->`, err);
                break;
        }
        morphedError.main = '<-----@niccsj/elastic-logger: errorHandler----->';
        console.error('\n' + JSON.stringify(morphedError) + '\n');
        if (ship) {
            console.log('<-----shipping this log to es----->');
            return morphedError;
        }

    } catch (err) {
        errorHandler({ err, type: 'nodejs', ship: false, self: true, scope: '@niccsj/elastic-logger.errorHandler' });
    }
};

module.exports = {
    errorHandler
};