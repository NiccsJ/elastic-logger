const axios = require('axios');
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

const bulkIndex = async (data, index, url) => {
    data = formatBulkLogs(data);
    index = index.toLowerCase();
    axios({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        url: url + '/' + index + '/_bulk',
        data: data
    }).then(resp => {
    }).catch(err => {
        console.error("In elastic-logger(err) ---> ", err);
    });
}

const formatBulkLogs = data => {
    let bulkData = "";
    data.map(log => {
        bulkData += `{"index": {}}\n${JSON.stringify(log)}\n`
    });
    return bulkData;
}

module.exports = {
    // indexDocument,
    bulkIndex,
}