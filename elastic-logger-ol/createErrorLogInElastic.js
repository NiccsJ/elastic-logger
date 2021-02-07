const momentTimezone = require('moment-timezone');
const { bulkIndex } = require('./crudApi');
// const TIMEZONE = "Asia/Calcutta";

let errorLogRequestBatch = [];

const createErrorLogInElastic = async (err, url, microServiceName, brand_name, cs_env, batchSize = 10, TIMEZONE = 'Asia/Calcutta') => {
  try {
    let date = momentTimezone().tz(TIMEZONE).startOf('day').format('YYYY-MM-DD');
    let dateTime = momentTimezone().tz(TIMEZONE).format();

    let log = {
      title: err.stack.split("\n")[0],
      description: err.stack,
      logDate: date,
      logDateTime: dateTime,
      "@timestamp": dateTime
    };

    if (errorLogRequestBatch.length >= batchSize) {
      let index = microServiceName + '_' + brand_name + '_' + cs_env;
      bulkIndex(errorLogRequestBatch, index, url);
      errorLogRequestBatch = [];
    };
    errorLogRequestBatch.push(log);
  } catch (error) {
  }
}

module.exports = {
  createErrorLogInElastic
}