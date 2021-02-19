# elastic-logger

![npm (scoped)](https://img.shields.io/npm/v/@niccsj/elastic-logger)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@niccsj/elastic-logger)

## Install ##
```shell
$ npm install @niccsj/elastic-logger --save
```

* Features:
   * Parses standard node.js error logs into clear JSON format and ships the logs from to an Elastic Search cluster.
     Enables ***easy visulatisaion and aggregation*** in ***Kibana*** without the need of ***Logstash*** or any other log formatting tool.
   * Includes a middleware which captures and ships all the incomming api logs along with necessary details.
   * Also, has the gives you an option to export outgoing api calls for tracking and logging.
   * Provies two custom Error classes and an errorHandler.
   * Automated index creation .via tempaltes. ILM enabled by default for rollover. Configures a default ILM policy. <!-- details can be seen in constants.js -->

* Fields available as of now:
  * title
  * description
  * logDate
  * logDateTime
  * @timestamp

## Pre-Requisits ##
* An elasticsearch cluster. <!-- single node clusters are also allowed -->
* Minimum 1 master node. Can provide multiple hosts for fault-tolerance.
* Kibana <!-- if you need to visualize -->


## Usage ##
Import the package at the very start of you application. <!-- typically, app.js -->

### Access/API Logs ###

```javascript
/* 
  app.js 
*/
const { exportAccessLogs, initializeElasticLogger } = require('@niccsj/elastic-logger');
```

Then, initialize it as follows.
You can either set the dynamic values from .env as above, or hard code it.

```javascript
const elasticLoggerObject = {
  esConnObj: {
    url: process.env.elasticUrl, //comma separated url of the ES nodes. Ex: elasticUrl='https://0.0.0.0:9200,https://0.0.0.0:9200'
    authType: process.env.elasticAuthType, //allowed values: 'none', 'basic', 'api'
    auth: { //required if authType !=none
      user: process.env.elasticUser, //required for basic
      pass: process.env.elasticPass, //required for basic
      apiKey: process.env.elasticApiKey //required for api //base64 encoded Id:apiKey from elasticsearch
    }, //if not provide, defaults to the values defined in constants.js
    sniff: false, //optional. Please read sniffing document before enabeling this option.
    sniffInterval: 30000, //optional
    sniffOnFault: false, //optional
    ssl: { //required if https is being used
      rejectUnauthorized: false
    }
  },
  // to specify default values
  brand_name: process.env.BRAND_NAME,
  cs_env: process.env.CS_ENV,
  microServiceName: process.env.MS_NAME,
  batchSize: 5, //logs are shipped in batches to improve speed.
  timezone: 'Asia/Calcutta',
  exportApiLogs: process.env.outGoingApiLogger ? true : false, //enables or disables the ability to ship outbout api logs to es. Defaults to true
  ilmObject: { //These objects can be ommited entirely if the default values from constants.js matches your need
    size: '2gb', //max size before index rollover 
    hotDuration: '2d', //max time index stays in hot phase
    warmAfter: '1h', //time to wait to move index to warm phase after rollover
    deleteAfter: '15d', //index is deleted after
    shrinkShards: 1, //shrinks the number of shards an index was in hot phase
    overwriteILM: false //allows you to overwrite an existing ILM policy
  },
  indexSettings: { //These objects can be ommited entirely if the default values from constants.js matches your need
    primaryShards: 3, //no of shards you want to allocate to an index. Can be more that nodes available.
    replicaShards: 1, //no of replicas to maintain. Should be atleast 1 to avoid data loss
    overwrite: false, //allows you to overwrite an existing template. Use with care
  }
};
s
initializeElasticLogger(elasticLoggerObject);
```

Then, we need to pass the function to the very first experss middleware after all servers settings have been defined.

```javascript
if (process.env.exportAccessLogs) {
  const elasticLoggerObject = { //defaults from constants.js
    microServiceName: 'ocs',
    brand_name: process.env.BRAND_NAME,
    cs_env: process.env.CS_ENV,
    batchSize: 2,
    timezone: 'Asia/Calcutta',
  };
  app.use(exportAccessLogs({})); //pass an emty object, if values from constants.js matches your need.
  app.use(exportAccessLogs(elasticLoggerObject)); //invoke like this if you feel the need to override some settings like batchSize etc.
}
```

### ErrorLogs ###

```javascript
/* 
  www
*/
const { exportErrorLogs } = require('@niccsj/elastic-logger');
```  

To enable error logs capturing, we'll listed on error events and invoke our functions as follows:

```javascript
process.on('unhandledRejection', (reason, promise) => {
  const errReason = reason.stack || reason;
  const err = `Reason--${errReason}`;
  if (process.env.elasticUrl) {
    const elasticLoggerObject = { //except err, all values are needed only if you plan to overwrite the values set during initilization.
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
    const elasticLoggerObject = { 
      err, //Required.
      scope: 'uncaughtException' //This can be any value as per your need. //can be omitted
    };
    exportErrorLogs(elasticLoggerObject);
  }
});
```