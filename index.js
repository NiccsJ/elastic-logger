const { bulkIndex} = require('./utils/elasticHandler/elasticApi');
const { exportAccessLogs} = require('./logger/exportAccessLogs');
const { overwriteHttpProtocol } = require('./logger/outGoingApiLogger');
const { initializeElasticLogger } = require('./logger/initializeElasticLogger');

module.exports = {
    bulkIndex,
    exportAccessLogs,
    overwriteHttpProtocol,
    initializeElasticLogger,
}