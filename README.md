# elastic-logger

![npm (scoped)](https://img.shields.io/npm/v/@niccsj/elastic-logger)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@niccsj/elastic-logger)

## Install

```shell
npm install @niccsj/elastic-logger --save
```

----

## Features

- Parses standard node.js error logs into clear JSON format and ships the logs from to an Elastic Search cluster. Enables ***easy visualization and aggregation*** in ***Kibana*** without the need of ***Logstash*** or any other log formatting tool.
- Includes a middleware which captures and ships all the incoming api logs along with necessary details.
- Also, has the gives you an option to export outgoing api calls for tracking and logging.
- Provides two custom Error classes and an errorHandler.
- Automated index creation .via templates. ILM enabled by default for rollover. A default policy is configured acc to values specified in constants.js.
- Automated index pattern creation in Kibana. Refreshes index pattern on each restart.
- Can be used as a stand alone logging library.
- Fields available as of now:
  - ErrorLogger:
    - name
    - message
    - description
    - meta
    - status
    - scope
    - type
    - metadata
    - parsed
  - AccessLogger:
    - url
    - method
    - headers
    - remoteAddress
    - remoteFamily
    - statusCode
    - statusMessage
    - processingTime
  - ApiLogger
    - url
    - processingTime
    - statusCode
  - CommonFields:
    - microService
    - logType
    - logDate
    - logDateTime
    - @timestamp

----

## Pre-Requisites

- An elasticsearch cluster.
- Minimum 1 master node. Can provide multiple hosts for fault-tolerance.
- Kibana for visualization and visibility.

----

## Functions and Classes available for import

- **initializeElasticLogger({ esConnObj, brand_name, cs_env, microServiceName, batchSize, timezone, ilmObject = {}, indexSettings = {} })**
  _Used to initialize elasticsearch client and setup default values._  
- **exportAccessLogs({ microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta' })**
  _Used to enable access logs shipping._  
- **exportErrorLogs({ err, ship = true, log = true, self = false, timezone = 'Asia/Calcutta', scope = '@niccsj/elastic-logger', status = null, exporter = false, batchSize, brand_name, cs_env, microServiceName })**
  _Used to enable error logs shipping._  
- **errorHandler({ err, microServiceName, brand_name, cs_env, batchSize, timezone = 'Asia/Calcutta', scope = 'global', status = null })**
  _A common error handler function._  
- **elasticError({ name, message, type = 'nodejs', status })**
  _An extended Error class used within the package, can be used in code for custom errors._  
- **dynamicError({ name, message, metadata, type = 'nodejs', status })**
  _An even extended elasticError, can be used in code to add custom error fields to the error object._  
- **esClientObj** _The elastic search client created within the library can be used within the code to add any custom functionality. Follows the standard elastic search API implementation_  

----

## Usage

### .env Example

```shell
#======== elk config =======#

#micro service name for elk
MS_NAME="ocs"
elasticEnv="dev"

#enable/disable elastic-loggers
exportLogs=true
exportAccessLogs=true
outGoingApiLogger=true

elasticUrl='https://1.1.1.1:9200,https://2.2.2.2:9200'
kibanaUrl='https://abc.xyz.com/kibana'

##elasticAuth
elasticAuthType='api'
elasticApiKey=''

elasticAuthType='basic'
elasticUser=''
elasticPass=''

elasticAuthType='none'

##index and ilm settings //edit to overwrite, comment for defaults
##this should be a valid json string
elasticTimezone='Asia/Clacutta'
elasticBatchSize='200'
ilmObject='{"size":"2gb", "hotDuration":"2d", "warmAfter":"1h", "deleteAfter":"5d", "shrinkShards":1, "overwriteILM":false }'
indexSettings='{ "primaryShards":3, "replicaShards":1, "overwrite":false }'

#======== elk config =========#
```

### Access/API Logs

Import the package at the very start of you application. Generally it's, app.js

----

```javascript
/*
  app.js
*/
const { exportAccessLogs, initializeElasticLogger } = require('@niccsj/elastic-logger');
```

Then, initialize it as follows.
You can either set the dynamic values from .env as above, or hard code it.

```javascript
const elasticLoggerObj = {};
elasticLoggerObj.esConnObj = {
  url: process.env.elasticUrl, //comma separated url of the ES nodes. Ex: elasticUrl='https://0.0.0.0:9200,https://0.0.0.0:9200'
  authType: process.env.elasticAuthType, //allowed values: 'none', 'basic', 'api'
  auth: { //required if authType !=none
    apiKey: process.env.elasticApiKey, //required for api //base64 encoded id:apiKey from elasticsearch
    username: process.env.elasticUser, //required for basic
    password: process.env.elasticPass //required for basic
  }, //if not provide, defaults to the values defined in constants.js
  ssl: { rejectUnauthorized: false }, //required if https is being used
  sniff: false, //optional. Please read sniffing document before enabling this option.
  sniffInterval: false, //optional
  sniffOnFault: false //optional
};
// to specify default values
elasticLoggerObj.brand_name = process.env.BRAND_NAME;
elasticLoggerObj.microServiceName = process.env.MS_NAME;
elasticLoggerObj.cs_env = process.env.elasticEnv ? process.env.elasticEnv : process.env.CS_ENV;
elasticLoggerObj.timezone = process.env.elasticTimezone ? process.env.elasticTimezone : 'Asia/Calcutta';
elasticLoggerObj.batchSize = Number(process.env.elasticBatchSize ? process.env.elasticBatchSize : 100); //logs are shipped in batches to improve speed and reduce load on elastic stack. IMP: do not set too low value, when expecting high number of requests.

elasticLoggerObj.ilmObject = (process.env.ilmObject) ? JSON.parse(process.env.ilmObject) : { "size": "500mb", "hotDuration": "2d", "warmAfter": "1h", "deleteAfter": "5d", "shrinkShards": 1, "overwriteILM": false }; //explanation below
//  ilmObject: { //These objects can be omitted entirely if the default values from constants.js matches your need
//     size: '500mb', //max size before index rollover
//     hotDuration: '2d', //max time index stays in hot phase
//     warmAfter: '1h', //time to wait to move index to warm phase after rollover
//     deleteAfter: '5d', //index is deleted after
//     shrinkShards: 1, //shrinks the number of shards an index was in hot phase
//     overwriteILM: false //allows you to overwrite an existing ILM policy. Use with care
//   },
elasticLoggerObj.indexSettings = (process.env.indexSettings) ? JSON.parse(process.env.indexSettings) : { "primaryShards": 3, "replicaShards": 1, "priority": 1, "overwrite": false }; //explanation below
  // indexSettings: { //These objects can be omitted entirely if the default values from constants.js matches your need
  //   primaryShards: 3, //no of shards you want to allocate to an index. Can be more that nodes available.
  //   replicaShards: 1, //no of replicas to maintain. Should be at least 1 to avoid data loss
  //   overwrite: false, //allows you to overwrite an existing template. Use with care
  // }
};
elasticLoggerObj.exportApiLogs = (process.env.outGoingApiLogger) ? true : false; //enables or disables the ability to ship outbound api logs to es. Defaults to true
initializeElasticLogger(elasticLoggerObj);
```

Then, we need to pass the function to the very first express middleware after all servers settings have been defined.

```javascript
if (process.env.exportAccessLogs) {
  const elasticLoggerObject = { //defaults from constants.js
    microServiceName: 'ocs',
    brand_name: process.env.BRAND_NAME,
    cs_env: process.env.CS_ENV,
    batchSize: 2,
    timezone: 'Asia/Calcutta',
  };
  app.use(exportAccessLogs({})); //pass an empty object, if values from constants.js matches your need.
  app.use(exportAccessLogs(elasticLoggerObject)); //invoke like this if you feel the need to override some settings like batchSize etc.
}
```

----

### ErrorLogs

```javascript
/*
  www
*/
const { exportErrorLogs, errorHandler } = require('@niccsj/elastic-logger');
```

To enable error logs capturing, we'll listed on error events and invoke our functions as follows:

```javascript
process.on('unhandledRejection', (reason, promise) => {
  const errReason = reason.stack || reason;
  const err = `Reason--${errReason}`;
  if (process.env.elasticUrl) {
    const elasticLoggerObject = { //except err, all values are needed only if you plan to overwrite the values set during initialization.
      err: reason, //Required. You can also pass the variable err if you want less verbose error output.
      microServiceName: 'ocs',
      brand_name: process.env.BRAND_NAME,
      cs_env: process.env.CS_ENV,
      batchSize: 0,
      timezone: 'Asia/Calcutta',
      scope: 'unhandledRejection' //This can be any value as per your need.
    };
    exportErrorLogs(elasticLoggerObject);
  }
});
```

Similarly,  

```javascript
process.on('uncaughtException', (err, origin) => {
  const errReason = reason.stack || reason;
  const err = `Reason--${errReason}`;
  if (process.env.elasticUrl) {
    const elasticLoggerObject = { //except err, all values are needed only if you plan to overwrite the values set during initialization.
      err, //Required.
      scope: 'uncaughtException' //This can be any value as per your need. //can be omitted
    };
    exportErrorLogs(elasticLoggerObject);
  }
});
```

To collect error exceptions caught with try/catch, you can either your your own errorHandling function or use the one included in this package.

- Own Function:

    ```javascript
    const handleAppError = async ({ err }) => {
      try {
        if (process.env.elasticUrl) {
          const elasticLoggerObject = { //except err, all values are needed only if you plan to overwrite the values set during initialization.
            err,
            microServiceName: 'ocs',
            brand_name: process.env.BRAND_NAME,
            cs_env: process.env.CS_ENV,
            batchSize: 0,
            timezone: 'Asia/Calcutta',
            scope: 'handleAppError'
          };
          exportErrorLogs(elasticLoggerObject);
        }
      } catch (err) {
        //
      }
    };

    const anyFunction = async (params) => {
      try {
        //operations
      } catch (err) {
         handleAppError({ err });
      }
    };

    ```

- IncludedFunction

    ```javascript
    const anyFunction = async (params) => {
      try {
        //opration
        //add the fields to metadata which you need to track
        const metadata = {}; //object
        metadata.sessionId = ''; //string
        metadata.psid = ''; //string
        metadata.platform = ''; //string
        const status = 872 //number

      } catch (err) {
         errorHandler({ err, ship: false, metadata: metadata, scope: '@niccsj/elastic-logger.initializeElasticLogger' });
      }
    };
    ```

  - Arguments explanation for errorHandler:
    - err = err | Object `The error object` ` Required `
    - ship = false/true | Bool ` Boolean to specify whether or not to ship this exception to elasticsearch. Can be useful if you need to silent some errors. ` ` Optional | Defaults to false `
    - log = false/true | Bool ` Boolean to specify whether or not to log the error to the console .via console.error() ` ` Optional | Defaults to true `
    - timezone = 'Asia/Calcutta' | String ` The timezone to be used. ` ` Optional | Defaults to 'Asia/Calcutta' `
    - metadata = { anyObject } | Object ` Addition variables/fields can to added to make pin point the origin of error `
    - scope = 'anyFunction' | String `A string value that can define a score of the error. Can be anything, for example the name of the function where the error originated. Can be used to track errors by function.` ` Optional | Defaults to '@niccsj/elastic-logger' `
    - status = 00 | Number ` A custom error code for your errors, can be used to track similarly api errors ` ` Optional | Defaults to null `
    - batchSize = 10 | Number ` Optional | Defaults to the values set during initialization `
    - brand_name = 'brand' | String ` Optional | Defaults to the values set during initialization `
    - cs_env = 'prod' | String ` Optional | Defaults to the values set during initialization `
    - microServiceName = 'authService' | String ` Optional | Defaults to the values set during initialization `

### Error Class

The only difference between `elasticError` and `dynamicError` is the additional filed metadata in the latter.

```javascript
const { dynamicError, elasticError } = require('@niccsj/elastic-logger');
const anyFunction = async () => {
  try {
    //some condition

    //use of metadata same as explained above
    //use case if you specifically want to throw an error based on a condition with specific values for identification.

    throw new dynamicError({ name: `${someName}`, message: `some message ${variable}`, metadata, status: `${status}`, type: 'optional' });

  } catch (err) {
    //handle error
  }
};
```
