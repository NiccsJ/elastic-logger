const esClientObj = {};
const elasticsearch = require('@elastic/elasticsearch');
const { checkSuppliedArguments } = require('../utilities');
const { errorHandler } = require('../errorHandler');
const { setUpILM, putIndexTemplate, putDefaultComponetTemplate } = require('../elasticHandler/elasticApi');
const { overwriteHttpProtocol } = require('../../logger/outGoingApiLogger');
const { defaultIlmPolicyValues, defaultIndexTemplateValues, defaultInitializationValues, defaultKibanaValues, dynamicTemplateComponentTemplateSettings, metadataCompomentTempalteSettings, debug } = require('../constants');

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

/**
 * Bootstraps the `elastic-logger`. Initializes the `outgoing api logger`. Sets up bootstrap `index` and `ILM`.
 * @param {object} i This defaults to values from `initialization` object if specified else from `constants.js` - an Object that has 13 properties.
 * @param {object=} [i.esConnObj] - (Optional) The connection object. Defaults to values from constants.js
 * @param {string=} [i.microServiceName] - (Optional) Name of microService. Defaults to constants.js
 * @param {string=} [i.brand_name] - (Optional) Name of brand. Defaults to constants.js
 * @param {string=} [i.cs_env] - (Optional) The environment name. Defaults to constants.js
 * @param {number=} [i.batchSize] - (Optional) Size of batch. Defaults to constants.js
 * @param {string=} [i.timezone] - (Optional) Timezone to be used by moment. Defaults to values from initialization object if specified else constants.js
 * @param {object=} [i.ilmObject] - (Optional) Object specifying ILM settings. Defaults to constants.js
 * @param {object=} [i.indexSettings] - (Optional) Object specifying index template settings. Defaults to constants.js
 * @param {boolean=} [i.exportApiLogs] - (Optional) Bool to enable outgoing api logger. Defaults to true
 *
 */

const initializeElasticLogger = async ({ esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone, ilmObject = {}, indexSettings = {}, maxHttpLogBodyLength, exportApiLogs = true, ship = true }) => {
	try {
		let { size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM } = ilmObject;
		let { primaryShards, replicaShards, priority, overwrite } = indexSettings;
		let { kibanaUrl } = defaultKibanaValues;
		let { dynamicMappings, dynamicSettings, overwriteDynamicTemplate } = dynamicTemplateComponentTemplateSettings;
		let { overwriteMappings, metadataMappings } = metadataCompomentTempalteSettings;

		//set up values/defaults for initialization from constants
		esConnObj = esConnObj ? esConnObj : defaultInitializationValues.esConnObj;
		elasticUrl = esConnObj.url ? esConnObj.url : defaultInitializationValues.esConnObj.url;
		brand_name = (brand_name ? brand_name : defaultInitializationValues.brand_name).toLowerCase();
		cs_env = (cs_env ? cs_env : defaultInitializationValues.cs_env).toLowerCase();
		microServiceName = microServiceName ? microServiceName : defaultInitializationValues.microServiceName;
		batchSize = batchSize ? batchSize : defaultInitializationValues.batchSize;
		timezone = timezone ? timezone : defaultInitializationValues.timezone;
		maxHttpLogBodyLength = maxHttpLogBodyLength ?? defaultInitializationValues.maxHttpLogBodyLength;

		//setup values/defaults from index template
		primaryShards = primaryShards ? primaryShards : defaultIndexTemplateValues.number_of_shards;
		replicaShards = replicaShards ? replicaShards : defaultIndexTemplateValues.number_of_replicas;
		priority = priority ? priority : defaultIndexTemplateValues.priority;
		overwrite = overwrite ? overwrite : defaultIndexTemplateValues.create;
		// componentTemplateName = composed_of ? composed_of : defaultIndexTemplateValues.composed_of;


		//set up values/defaults for ILM from constants
		policyName = (cs_env && brand_name) ? `${cs_env}_${brand_name}_policy` : defaultIlmPolicyValues.policyName;
		size = size ? size : defaultIlmPolicyValues.size;
		hotDuration = hotDuration ? hotDuration : defaultIlmPolicyValues.hotDuration;
		warmAfter = warmAfter ? warmAfter : defaultIlmPolicyValues.warmAfter;
		deleteAfter = deleteAfter ? deleteAfter : defaultIlmPolicyValues.deleteAfter;
		shrinkShards = shrinkShards ? (primaryShards % (primaryShards - shrinkShards) == 0) ? (primaryShards - shrinkShards) : defaultIlmPolicyValues.shrinkShards : defaultIlmPolicyValues.shrinkShards;
		overwriteILM = overwriteILM ? overwriteILM : defaultIlmPolicyValues.overwriteILM;

		const initializerValid = await checkSuppliedArguments({ err: 'initializing', esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, exporterType: 'initializer' });
		if (initializerValid) {
			if (esClientObj && !esClientObj.client) esClientObj.client = await connection(esConnObj);
			esClientObj.status = true;
			esClientObj.defaultLoggerDetails = { esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone, maxHttpLogBodyLength };
			console.log('-----------------------ELASTIC-LOGGER INITIALIZED-----------------------');
			if (debug) console.log('\n<><><><> DEBUG <><><><>\nES CLIENT OBJ DEFAULT LOGGER DETAILS: ', JSON.stringify(esClientObj.defaultLoggerDetails, null, 4), '\n<><><><> DEBUG <><><><>\n');

			if (kibanaUrl) {
				console.log('-----------------------KIBANA APIs ENABLED-----------------------');
				const { createIndexPattern } = require('../kibanaHandler/indexPatternApis');
				createIndexPattern({ brand_name, cs_env });
			}

			setUpILM({ policyName, size, hotDuration, warmAfter, deleteAfter, shrinkShards, overwriteILM });
			putDefaultComponetTemplate({ componentTemplateName: "common_dynamic_template_component_template", mappings: dynamicMappings, settings: dynamicSettings, overwriteMappings: overwriteDynamicTemplate });
			putDefaultComponetTemplate({ componentTemplateName: "common_metadata_component_template", mappings: metadataMappings, overwriteMappings });
			putIndexTemplate({ brand_name, cs_env, microServiceName, primaryShards, replicaShards, priority, overwrite, dynamicMappings, metadataMappings, overwriteMappings });
			if (exportApiLogs) overwriteHttpProtocol({ microServiceName, brand_name, cs_env, batchSize, timezone, maxHttpLogBodyLength, elasticUrl, kibanaUrl, ship });
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
};