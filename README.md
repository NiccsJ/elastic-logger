# elastic-logger

![npm (scoped)](https://img.shields.io/npm/v/@niccsj/elastic-logger)
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@niccsj/elastic-logger)


Parses standard node.js error logs into JSON format and ships the logs from to an Elastic Search cluster.
Enables ***easy visulatisaion and aggregation*** in ***Kibana*** without the need of ***Logstash*** or any other log formatting tool.

* Fields available as of now:
  * title
  * description
  * logDate
  * logDateTime
  * @timestamp

## Pre-Requisits ##
* A SSL enabled elasticsearch cluster.
* Minimum 1 master node. Can provide multiple hosts for fault-tolerance.
* API key or Basic authentication.


## Install ##
```
$ npm install @niccsj/elastic-logger --save
```

## Usage ##
```
const elastic-logger = require('@niccsj/elastic-logger');
```
