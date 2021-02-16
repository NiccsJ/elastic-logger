/*
Endpoint Configuration
*/
const BASE_URL = 'http://169.254.169.254/latest/';
const METADATA_ENDPOINT = 'meta-data/';


/*
Default Values
*/
const defaultInitializationValues = {
    batchSize: 10,
    timezone: 'Asia/Calcutta',
    scope: 'global',
    authType: 'none',
    brand_name: process.env.BRAND_NAME,
    cs_env: process.env.CS_ENV,
    microServiceName: process.env.MS_NAME,
    elasticUrl: process.env.elasticUrl
};


module.exports = {
    defaultInitializationValues
};