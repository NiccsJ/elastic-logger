let argsValid;
const momentTimezone = require('moment-timezone');
const { errorHandler, elasticError } = require('../utils/errorHandler');
const { checkSuppliedArguments, shipDataToElasticsearh } = require('../utils/utilities');

const overwriteHttpProtocol = ({ microServiceName, brand_name, cs_env, batchSize = 10, TIMEZONE = "Asia/Calcutta", esConnObj }) => {
    try {
        let url = (esConnObj && esConnObj.url) ? esConnObj.url : process.env.elasticUrl;
        if (!url) throw new elasticError({ name: 'Initialization failed:', message: `overwriteHttpProtocol: 'elasticUrl' argument missing`, type: 'elastic-logger', status: 999 });
        const urls = url.split(',');
        const httpObj = require('http');
        const httpsObj = require('https');
        const patch = (object) => {
            try {
                const original = object.request;
                object.request = (options, callback) => {
                    try {
                        const requestStart = Date.now();
                        function newCallback () {
                            try {
                                const res = arguments[0];
                                const ipPorts = urls.map(url => { return url.split("//")[1] });
                                const ips = ipPorts.map(ipPort => { return ipPort.split(":")[0] });
                                const hostname = ips;
                                console.log('hostname, options--------->', hostname, options.hostname);
                                if (options && options.hostname && !hostname.includes(options.hostname)) {
                                    console.log('hostname, options--------->', hostname, options.hostname);
                                    let href = options.href ? options.href : options.hostname + options.path;
                                    outBoundApiLogger({ href, requestStart, res: res.statusCode, microServiceName, brand_name, cs_env, batchSize, esConnObj });
                                }
                                if (callback) {
                                    callback.apply(this, arguments);
                                }
                            } catch (err) {
                                errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol.patch.object.request.newCallback' });
                            }
                        };
                        let req = original(options, newCallback);
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
}

const outBoundApiLogger = async ({ href, requestStart, statusCode, microServiceName, brand_name, cs_env, batchSize, esConnObj }) => {
    try {
        if (!argsValid) argsValid = await checkSuppliedArguments({ err: 'outGoingLogs', esConnObj, microServiceName, brand_name, cs_env });
        if (!argsValid) throw new elasticError({ name: 'Initialization failed:', message: `exportErrorLogs: Argument(s) missing`, type: 'elastic-logger', status: 999 });
        let processingTime = Date.now() - requestStart;
        const NUMERIC_REGEXP = /[4-9]{1}[0-9]{9}/g;
        console.log('href in outgoing logger----->', href);
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
        let log = {
            processingTime,
            url: href,
            statusCode: statusCode,
            logDate: date,
            // logDateTime: dateTime,
            "@timestamp": dateTime,
        };
        shipDataToElasticsearh({ log, batchSize, brand_name, microServiceName, cs_env, checkArgs: true });

    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.outBoundApiLogger' });
    }
}

module.exports = {
    overwriteHttpProtocol
}