const esClientObj = {};
const { checkSuppliedArguments } = require('@niccsj/elastic-logger/utils/utilities');
const elasticsearch = require('@elastic/elasticsearch');
const { errorHandler, elasticError } = require('@niccsj/elastic-logger/utils/errorHandler');

const connection = async (esConnObj) => {
	try {
		const { url, authType, auth, sniff, sniffOnFault, sniffInterval } = esConnObj;
		const nodeArray = url.split(',');
		const options = {};
		// options.name = '@niccsj/eslogg';
		options.node = nodeArray;
		options.maxRetries = 5;
		options.requestTimeout = 10000;
		options.sniffOnStart = sniff ? sniff : false;
		options.sniffOnConnectionFault = sniffOnFault ? sniffOnFault : false;
		options.sniffInterval = sniffInterval ? sniffInterval : false; //eg: 300000: sniffs every 5 miutes

		if (authType != 'none') {
			options.auth = {};
			if (authType == 'basic') {
				options.auth.username = auth.user;
				options.auth.password = auth.pass;
			} else if (authType == 'api') {
				options.auth.apiKey = auth.pass;
			} else { //not needed now
				throw new elasticError({ name: 'Argument(s) validation error:', message: `Invalid authType specified: '${esConnObj.authType}'. Allowed values are: 'none', 'basic', 'api'.`, type: 'nodejs', status: 998 });
			}
		}
		const client = new elasticsearch.Client(options);
		console.log('-----------------------INITIALIZED-----------------------');
		return client;
	} catch (err) {
		errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.connection' });
		return false;
	}
};

const initializeElasticLogger = async ({ esConnObj }) => {
	try {
		const proceed = await checkSuppliedArguments({ err: 'i', esConnObj, microServiceName: 'i', brand_name: 'i', cs_env: 'i' });
		if (!proceed) throw new elasticError({ name: 'Initialization failed: ', message: `elastic-logger could not be initialized`, type: 'elastic-logger', status: 999 });
		if (esClientObj && !esClientObj.client) esClientObj.client = await connection(esConnObj);
	} catch (err) {
		errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
	}
}

module.exports = {
	initializeElasticLogger,
	esClientObj
}