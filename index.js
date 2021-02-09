const { exportAccessLogs} = require('./logger/exportAccessLogs');
const { overwriteHttpProtocol } = require('./logger/outGoingApiLogger');
const { initializeElasticLogger } = require('./logger/initializeElasticLogger');

module.exports = {
    exportAccessLogs,
    overwriteHttpProtocol,
    initializeElasticLogger,
}