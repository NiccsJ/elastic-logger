require("dotenv").config();
const { initializeElasticLogger } = require('./utils/elasticHandler/initializeElasticLogger');
const { exportAccessLogs} = require('./logger/exportAccessLogs');
const { exportErrorLogs } = require('./logger/exportErrorLogs');
const { errorHandler, elasticError, dynamicError} = require('./utils/errorHandler');

module.exports = {
    initializeElasticLogger,
    exportAccessLogs,
    exportErrorLogs,
    errorHandler,
    elasticError,
    dynamicError
}