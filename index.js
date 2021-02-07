const { indexDocument, bulkIndex} = require('./elastic-logger/crudApi');
const { exportAccessLogs} = require('./elastic-logger/exportAccessLogs');
const { overwriteHttpProtocol } = require('./elastic-logger/outGoingApiLogger');
const { createErrorLogInElastic } = require('./elastic-logger/createErrorLogInElastic');

module.exports = {
    indexDocument,
    bulkIndex,
    exportAccessLogs,
    overwriteHttpProtocol,
    createErrorLogInElastic,
}