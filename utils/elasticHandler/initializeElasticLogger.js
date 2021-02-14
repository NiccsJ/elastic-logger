const esClientObj = {};
const elasticsearch = require('@elastic/elasticsearch');
const { checkSuppliedArguments } = require('../utilities');
const { errorHandler, elasticError } = require('../errorHandler');

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
		return client;
	} catch (err) {
		throw(err);
		// errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.connection' });
		// return false;
	}
};

const initializeElasticLogger = async ({ esConnObj, brand_name, cs_env, microServiceName, batchSize = 10, timezone = 'Asia/Calcutta' }) => {
	try {
		const initializerValid = await checkSuppliedArguments({ err: 'initializing', esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'initializer' });
		if (initializerValid) {
			if (esClientObj && !esClientObj.client) esClientObj.client = await connection(esConnObj);
			esClientObj.status = true;
			esClientObj.defaultLoggerDetails = { esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone };
			console.log('-----------------------ELASTIC-LOGGER INITIALIZED-----------------------');
			return true; //is this needed?
		}
	} catch (err) {
		errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
		esClientObj.status = false;
		return false;
	}
}

module.exports = {
	initializeElasticLogger,
	esClientObj
}