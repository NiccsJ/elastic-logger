const esClientObj = {};
const elasticsearch = require('@elastic/elasticsearch');
const { checkSuppliedArguments } = require('../utilities');
const { errorHandler, elasticError } = require('../errorHandler');

const connection = async (esConnObj) => {
	try {
		const { url, authType, auth, sniff, sniffOnFault, sniffInterval, ssl } = esConnObj;
		const nodeArray = url.split(',');
		const options = {};

		options.node = nodeArray;
		options.maxRetries = 5;
		options.requestTimeout = 10000;
		if (authType != 'none') options.auth = auth ? auth : {};
		options.sniffOnStart = sniff ? sniff : false; //sniff disabled by default
		options.sniffOnConnectionFault = sniffOnFault ? sniffOnFault : false;
		options.sniffInterval = sniffInterval ? sniffInterval : false; //eg: 30000: sniffs every 30 seconds
		options.ssl = ssl ? ssl : { rejectUnauthorized: false }; //disabling certificate verification by default

		const client = new elasticsearch.Client(options);
		return client;
	} catch (err) {
		throw (err);
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
			return true;
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