/*
Endpoint Configuration
*/
const BASE_URL = 'http://169.254.169.254/latest/';
const METADATA_ENDPOINT = 'meta-data/';


/*
Default Values
*/
const defaultInitializationValues = {
    esConnObj: {
        url: process.env.elasticUrl,
        authType: 'api',
        auth: {
            apiKey: process.env.elasticApiKey
        },
        sniff: false,
        sniffInterval: 30000,
        sniffOnFault: false,
        ssl: {
            rejectUnauthorized: false
        }
    },
    brand_name: process.env.BRAND_NAME,
    cs_env: process.env.CS_ENV,
    microServiceName: process.env.MS_NAME,
    batchSize: 10,
    timezone: 'Asia/Calcutta',
};

const defaultIndexTemplateValues = {
    create: false,
    name: 'default_elastic_logger_template',
    index_patterns: 'default_elastic_logger_*',
    number_of_shards: 2,
    number_of_replicas: 0,
    "index.lifecycle.name": 'default_elastic_logger_policy',
    "index.lifecycle.rollover_alias": 'default_elastic_logger'
};

const defaultIlmPolicyValues = {
    policyName: 'default_elastic_logger_policy', 
    size: '2gb', 
    hotDuration: '2d', 
    warmAfter: '1h', 
    deleteAfter: '15d',
    shrinkShards: defaultIndexTemplateValues.number_of_shards
};

module.exports = {
    defaultInitializationValues,
    defaultIlmPolicyValues,
    defaultIndexTemplateValues
};