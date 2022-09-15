const packageVersion = 'v3.6.3';

/*
Cloud Metadata Endpoint Configuration
*/
const enableCloudMetadata = process.env.elasticCloudMetadata ? true : false;
const cloudType = process.env.elasticCloudType ? process.env.elasticCloudType : 'none';

/*
AWS Metadata
*/
const AWS_METADATA_BASE_URL = 'http://169.254.169.254/latest/';
const AWS_METADATA_ENDPOINT = AWS_METADATA_BASE_URL + 'meta-data/';

const AWS_METADATA_ENDPOINT_MAPPINGS = {
    'instance-id': 'instance-id', //return instance-id
    'public-ip': 'public-ipv4', //return public-ip
    'private-ip': 'local-ipv4', //returns private-ip
    'instance-type': 'instance-type', //return instance-type
    'az': 'placement/availability-zone', //return the az
    'ami-id': 'ami-id', //returns ami-id
    'hostname': 'hostname', //returns hostname
};

const DEFAULT_AWS_METADATA_OBJECT = {
    type: 'aws',
    data: {
        'instance-id': 'not-ready',
        'public-ip': 'not-ready',
        'private-ip': 'not-ready',
        'instance-type': 'not-ready',
        'az': 'not-ready',
        'ami-id': 'not-ready',
        'hostname': 'not-ready'
    }
};

/*
Default Values
*/

const debug = process.env.elasticDebug ? process.env.elasticDebug : false;
const defaultKibanaValues = { kibanaUrl: process.env.kibanaUrl };

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
    brand_name: process.env.BRAND_NAME ? process.env.BRAND_NAME : 'default',
    cs_env: process.env.elasticEnv ? process.env.elasticEnv : process.env.CS_ENV ? process.env.CS_ENV : 'default',
    microServiceName: process.env.MS_NAME ? process.env.MS_NAME : 'default',
    batchSize: 100,
    timezone: 'Asia/Calcutta',
    maxHttpLogBodyLength: 100 * 1024 //default 100KB
};

const defaultIndexTemplateValues = {
    create: false,
    priority: 1,
    name: 'default_elastic_logger_template',
    index_patterns: 'default_elastic_logger$$-*',
    number_of_shards: 3,
    number_of_replicas: 1,
    "index.lifecycle.name": 'default_elastic_logger_policy',
    "index.lifecycle.rollover_alias": 'default_elastic_logger$$',
};

const defaultIlmPolicyValues = {
    policyName: 'default_elastic_logger_policy',
    size: '2gb',
    hotDuration: '2d',
    warmAfter: '1h',
    deleteAfter: '15d',
    shrinkShards: 1,
    overwriteILM: false
};

const defaultSocketEventsToListen = ['connect', 'connection', 'disconnect', 'error', 'connect_error', 'reconnecting', 'connect_timeout', 'reconnect_failed', 'reconnect_error'];
// const defaultSocketEventsToListen = ['disconnect'];


const metadataCompomentTempalteSettings = {
    metadataMappings: {
        properties: {
            metadata: {
                type: "object",
                dynamic: process.env.strictMetadata ? false : true,
                properties: process.env.metadataMappings ? process.env.metadataMappings : {
                    "sessionId": { type: "text", fields: { keyword: { type: "keyword" } } },
                    "psid": { type: "text", fields: { keyword: { type: "keyword" } } },
                    "platform": { type: "text", fields: { keyword: { type: "keyword" } } },
                    "workflowId": { type: "text", fields: { keyword: { type: "keyword" } } }
                }
            }
        }
    },
    overwriteMappings: (process.env.metadataMappingsOverwrite && process.env.metadataMappingsOverwrite == 'true') ? true : false,
    // dynamicComponentName: "common_metadata_component_template"
};

const dynamicTemplateComponentTemplateSettings = {
    dynamicMappings: {
        // dynamic: true,
        // date_detection: true,
        // dynamic_date_formats: ["strict_date_optional_time", "yyyy/MM/dd HH:mm:ss Z||yyyy/MM/dd Z"],
        dynamic_templates: [
            {
                "bypass_ignore_above_": {
                    "mapping": { "type": "text", "fields": { "keyword": { "ignore_above": 1024, "type": "keyword" } } },
                    "match_mapping_type": "string"
                }
            }
        ]
    },
    // metadataComponentName: "common_dynamic_template_component_template"
};

module.exports = {
    defaultInitializationValues,
    defaultIlmPolicyValues,
    defaultIndexTemplateValues,
    defaultKibanaValues,
    dynamicTemplateComponentTemplateSettings,
    metadataCompomentTempalteSettings,
    debug,
    enableCloudMetadata,
    cloudType,
    AWS_METADATA_BASE_URL,
    AWS_METADATA_ENDPOINT,
    AWS_METADATA_ENDPOINT_MAPPINGS,
    DEFAULT_AWS_METADATA_OBJECT,
    defaultSocketEventsToListen,
    packageVersion
};