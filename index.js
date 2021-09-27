require("dotenv").config();
const { initializeElasticLogger, esClientObj } = require('./utils/elasticHandler/initializeElasticLogger');
const { exportAccessLogs, exportSocketAccessLogs } = require('./logger/exportAccessLogs');
const { exportErrorLogs } = require('./logger/exportErrorLogs');
const { errorHandler, elasticError, dynamicError } = require('./utils/errorHandler');

module.exports = {
    initializeElasticLogger,
    esClientObj,
    exportAccessLogs,
    exportErrorLogs,
    exportSocketAccessLogs,
    errorHandler,
    elasticError,
    dynamicError
};