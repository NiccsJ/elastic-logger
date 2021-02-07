// const momentTimezone = require('moment-timezone');
const { bulkIndex } = require('./crudApi');
const { errorHandler } = require('./errorHandler');
let errorLogRequestBatch = [];


const createErrorLogInElastic = async ({ err, url, authType, auth, microServiceName, brand_name, cs_env, batchSize = 10, timezone = 'Asia/Calcutta', scope }) => {
  try {
    if (!err || !url || !authType || !microServiceName || !brand_name || cs_env) {
      if (authType == 'none' && !auth) { //testing needed
        throw new Error('Arguments missing: elastic-logger not initialized.', err);
      }
    }
    scope = scope ? scope : 'manualFunctionCall';
    const log = await errorHandler({ err, type: 'nodejs', ship: true, timezone: timezone, scope });
    // console.log('morphed log---->', log);
    // errorLogRequestBatch.push(log);
    if (errorLogRequestBatch.length >= batchSize) {
      const index = brand_name + '_' + microServiceName + '_' + cs_env;
      switch (authType) {
        case 'none':
          bulkIndex(errorLogRequestBatch, index, url, authType, null);
          errorLogRequestBatch = [];
          break;
        case 'basic':
          bulkIndex(errorLogRequestBatch, index, url, authType, auth);
          errorLogRequestBatch = [];
          break;
        case 'api':
          // bulkIndex(errorLogRequestBatch, index, url, authType, auth);
          // errorLogRequestBatch = [];
          break;
        default:
          throw Error('Invalid authType specified: Allowed values are: none, basic, api');
          break;
      }
    };
    errorLogRequestBatch.push(log);
  } catch (err) {
    // console.log('errrr->', err);
    errorHandler({ err, type: 'nodejs', ship: true, scope: '@niccsj/elastic-logger.createErrorLogInElastic' });
  }
}

module.exports = {
  createErrorLogInElastic
}