const axios = require('axios');
const { errorHandler } = require('./errorHandler');

const bulkIndex = async (data, index, url, authType, auth = null) => {
    data = formatBulkLogs(data);
    index = index.toLowerCase();
    axios({
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        url: url + '/' + index + '/_bulk',
        auth: authType == 'basic' ? { 'username': '-----', 'password': '-----' } : authType == 'api' ? 'api' : null,
        data: data
    }).then(resp => {
    }).catch(err => {
        errorHandler({ err, type: 'axios', ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    });
}

const formatBulkLogs = data => {
    try {
        let bulkData = "";
        data.map(log => {
            bulkData += `{"index": {}}\n${JSON.stringify(log)}\n`
        });
        return bulkData;
    } catch (err) {
        errorHandler({ err, type: 'nodejs', ship: false, scope: '@niccsj/elastic-logger.formatBulkLogs' });
    }
}

module.exports = {
    bulkIndex,
}