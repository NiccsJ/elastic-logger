/*
Endpoint Configuration
*/
const BASE_URL = 'http://169.254.169.254/latest/';
const METADATA_ENDPOINT = 'meta-data/';


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
    cs_env: process.env.CS_ENV ? process.env.CS_ENV : 'default',
    microServiceName: process.env.MS_NAME ? process.env.MS_ENV : 'default',
    batchSize: 20,
    timezone: 'Asia/Calcutta',
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

const metadataCompomentTempalteSettings = {
    metadataMappings: {
        properties: {
            metadata: {
                type: "object",
                dynamic: process.env.strictMetadata ? true : false,
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
    debug
};