# elastic-logger

![npm (scoped)](https://img.shields.io/npm/v/@niccsj/elastic-logger)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@niccsj/elastic-logger)

## Install ##
```
$ npm install @niccsj/elastic-logger --save
```

* Features:
   * Parses standard node.js error logs into clear JSON format and ships the logs from to an Elastic Search cluster.
     Enables ***easy visulatisaion and aggregation*** in ***Kibana*** without the need of ***Logstash*** or any other log formatting tool.
   * Includes a middleware which captures and ships all the incomming api logs along with necessary details.
   * Also, has the gives you an option to export outgoing api calls for tracking and logging.
   * Provies two custom Error classes and an errorHandler.

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
import the package at the very start of you application. <!-- typically, app.js -->

```
const { exportAccessLogs, initializeElasticLogger } = require('@niccsj/elastic-logger');
```

Then, initialize it as follows.
You can either set the dynamic values from .env as above, or hard code it.
```
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
  exportApiLogs: process.env.outGoingApiLogger ? true : false //enables or disables the ability to ship outbout api logs to es. Defaults to true
};

initializeElasticLogger(elasticLoggerObject);
```

