let errorLogRequestBatch = [];
const { bulkIndex } = require('@niccsj/elastic-logger/utils/elasticHandler/elasticApi');
const { checkSuppliedArguments } = require('@niccsj/elastic-logger/utils/utilities');
const { errorHandler, elasticError } = require('@niccsj/elastic-logger/utils/errorHandler');

const initializeElasticLogger = async ({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta', scope = 'global' }) => {
  try {
      if (await checkSuppliedArguments({ err, esConnObj, microServiceName, brand_name, cs_env, batchSize, timezone, scope }));
      const log = await errorHandler({ err, ship: true, timezone: timezone, scope });
      if (errorLogRequestBatch.length >= batchSize) {
          const index = brand_name + '_' + microServiceName + '_' + cs_env;
          bulkIndex(errorLogRequestBatch, index, esConnObj);
          errorLogRequestBatch = [];
      }
      errorLogRequestBatch.push(log);
  } catch (err) {
      errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
  }
}

module.exports = {
  initializeElasticLogger
}