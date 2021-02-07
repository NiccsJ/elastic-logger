const axios = require('axios');
const { errorHandler } = require('./errorHandler');
// const uuidv4 = require('uuid/v4');

// const indexDocument = async (data, index, url) => {
//     axios({
//         method: 'PUT',
//         headers: { 'content-type': 'application/json' },
//         url: url + '/' + index + '/_doc/' + uuidv4(),
//         data: data
//     }).then(resp => {
//     }).catch(err => {
//         console.error("In elastic-logger(err) ---> ", err);
//     });
// }

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
        auth: authType == 'basic' ? { 'username': '-----', 'password': '-----' } : authType == 'api' ? 'api' : null,
        data: data
    }).then(resp => {
        // console.log('Success----->', resp.data);
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
    // indexDocument,
    bulkIndex,
}