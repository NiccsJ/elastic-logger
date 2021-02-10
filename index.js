const { initializeElasticLogger } = require('./utils/elasticHandler/initializeElasticLogger');
const { exportAccessLogs} = require('./logger/exportAccessLogs');
const { exportErrorLogs } = require('./logger/exportErrorLogs');
const { overwriteHttpProtocol } = require('./utils/utilities');
const { errorHandler, elasticError } = require('./utils/errorHandler');

module.exports = {
    initializeElasticLogger,
    exportAccessLogs,
    exportErrorLogs,
    overwriteHttpProtocol,
    errorHandler,
    elasticError,
}