const esClientObj = {};
const elasticsearch = require('@elastic/elasticsearch');
const { checkSuppliedArguments } = require('../utilities');
const { errorHandler, elasticError } = require('../errorHandler');
const { setUpILM, putIndexTemplate } = require('../elasticHandler/elasticApi');
const { defaultIlmPolicyValues, defaultIndexTemplateValues, defaultInitializationValues } = require('../constants');

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

const initializeElasticLogger = async ({ esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone, ilmObject = {}, indexSettings = {} }) => {
	try {
		let { size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM } = ilmObject;
		let { primaryShards, replicaShards, overwrite } = indexSettings;

		//set up values/defaults for initialization from constants
		esConnObj = esConnObj ? esConnObj : defaultInitializationValues.esConnObj;
		brand_name = brand_name ? brand_name : defaultInitializationValues.brand_name;
		cs_env = cs_env ? cs_env : defaultInitializationValues.cs_env;
		microServiceName = microServiceName ? microServiceName : defaultInitializationValues.microServiceName;
		batchSize = batchSize ? batchSize : defaultInitializationValues.batchSize;
		timezone = timezone ? timezone : defaultInitializationValues.timezone;

		//setup values/defaults from index template
		primaryShards = primaryShards ? primaryShards : defaultIndexTemplateValues.number_of_shards;
		replicaShards = replicaShards ? replicaShards : defaultIndexTemplateValues.number_of_replicas;
		overwriteILM = overwriteILM ? overwriteILM : defaultIndexTemplateValues.overwriteILM;

		//set up values/defaults for ILM from constants
		policyName = (cs_env && brand_name) ? `${cs_env}_${brand_name}_policy` : defaultIlmPolicyValues.policyName;
		size = size ? size : defaultIlmPolicyValues.size;
		hotDuration = hotDuration ? hotDuration : defaultIlmPolicyValues.hotDuration;
		warmAfter = warmAfter ? warmAfter : defaultIlmPolicyValues.warmAfter;
		deleteAfter = deleteAfter ? deleteAfter : defaultIlmPolicyValues.deleteAfter;
		shrinkShards = shrinkShards ? shrinkShards : (primaryShards === 1) ? primaryShards : (primaryShards - 1);
		overwrite = overwrite ? overwrite : defaultIlmPolicyValues.overwrite;

		const initializerValid = await checkSuppliedArguments({ err: 'initializing', esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'initializer' });
		if (initializerValid) {
			if (esClientObj && !esClientObj.client) esClientObj.client = await connection(esConnObj);
			esClientObj.status = true;
			esClientObj.defaultLoggerDetails = { esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone };
			console.log('-----------------------ELASTIC-LOGGER INITIALIZED-----------------------');
			setUpILM({ policyName, size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM });
			putIndexTemplate({ brand_name, cs_env, microServiceName, primaryShards, replicaShards, overwrite });
			return true;
		}
	} catch (err) {
		errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
		esClientObj.status = false;
		return false;
	}
};

module.exports = {
	initializeElasticLogger,
	esClientObj
}