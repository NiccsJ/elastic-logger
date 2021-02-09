let errorLogRequestBatch = [];
const { bulkIndex } = require('../utils/elasticHandler/elasticApi');
const { checkSuppliedArguments } = require('../utils/utilities');
const { errorHandler, elasticError } = require('../utils/errorHandler');

const initializeElasticLogger = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta', scope = 'global' }) => {
	try {
		const proceed = await checkSuppliedArguments({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, scope });
		if (!proceed) throw new elasticError({ name: 'Initialization failed: ', message: `elastic-logger could not be initialized`, type: 'elastic-logger', status: 999 });
		const log = await errorHandler({ err, ship: true, timezone: timezone, scope });
		errorLogRequestBatch.push(log);
		if (errorLogRequestBatch.length >= batchSize) {
			const index = brand_name + '_' + microServiceName + '_' + cs_env;
			bulkIndex(errorLogRequestBatch, index, esConnObj);
			errorLogRequestBatch = [];
		}
		// errorLogRequestBatch.push(log);
	} catch (err) {
		errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
	}
}

module.exports = {
	initializeElasticLogger
}