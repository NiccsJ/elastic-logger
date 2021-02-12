let client;
const { errorHandler, elasticError, esError } = require('../errorHandler');


//to-do add create index, get index, index mapping, ilm

// const createIndex = async (index, mappings) => {

// };

// const createIlm = async (index, options, callback) => {
//     try {
//         console.log('yoyoyo perform some op');
//         callback(null, { index, options });
//         yo
//     } catch (err) {
//         callback('errr occured', null);
//     };
// };

// setTimeout(() => {
//     createIlm('index', 'options', (err, data) => {
//         try {
//             if (err) throw new elasticError({ name: 'ElasticAPI error:', message: err, type: 'elasticsearch', status: 777 });
//             console.log('yo this is resp--->', data);
//         } catch (err) {
//             errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.createIlm' });
//         }

//     })
// }, 3000);


const bulkIndex = async (logs, index) => {
    try {
        // let client = (esClientObj && esClientObj.client) ? esClientObj.client : null;
        if (!client) client = require('./initializeElasticLogger').esClientObj.client;

        const body = logs.flatMap(log => [{ index: { _index: index } }, log]);
        const { body: bulkResponse } = await client.bulk({ refresh: true, body });
        if (bulkResponse.errors) {
            throw new esError({ name: 'ElasticAPI error:', message: `Unable to shipt logs .via bulkIndex API`, description: `${JSON.stringify(bulkResponse.items)}`, status: 888 });
        }
        //handle error
        console.log('bulkResponse---->', bulkResponse);
    } catch (err) {
        errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.bulkIndex' });
    }
};

module.exports = {
    bulkIndex,
}