const axios = require('axios');
const { errorHandler } = require('./errorHandler');

const bulkIndex = async (data, index, url, authType, auth = null) => {
    data = formatBulkLogs(data);
    index = index.toLowerCase();
    console.log('data after--->', data);
    axios({
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        url: url + '/' + index + '/_bulk',
        auth: authType == 'basic' ? { 'username': 'niccsj', 'password': '/8ra{8+K2fxcE^H2' } : authType == 'api' ? 'api' : null,
        data: data
    }).then(resp => {
    }).catch(err => {
        errorHandler({ err, type: 'axios', ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    });
}

const formatBulkLogs = data => {
    try {
        console.log('formatData--->', data);
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