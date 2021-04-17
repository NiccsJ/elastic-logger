require("dotenv").config();
const { initializeElasticLogger, esClientObj } = require('./utils/elasticHandler/initializeElasticLogger');
const { exportAccessLogs} = require('./logger/exportAccessLogs');
const { exportErrorLogs } = require('./logger/exportErrorLogs');
const { errorHandler, elasticError, dynamicError} = require('./utils/errorHandler');

module.exports = {
    initializeElasticLogger,
    esClientObj,
    exportAccessLogs,
    exportErrorLogs,
    errorHandler,
    elasticError,
    dynamicError
};