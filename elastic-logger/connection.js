const elasticsearch = require('elasticsearch');


const client = async (hostsArray) => {
    const client = new elasticsearch.Client({ hosts: hostsArray });
    return client;
};



module.exports = {
    client,
    // client
};