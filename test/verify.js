// // setTimeout(async () => {
// //     console.log('\n<><><><><><><> HTTP POST <><><><><><><>\n');
// //     await axios({
// //       method: 'POST',
// //       headers: { 'content-type': 'application/json' },
// //       url: process.env.oriNlpUrl + '/results',
// //       data: { message: 'hello', modelName: process.env.oriNlpModelName },
// //     }).then((result) => {
// //       result = result.data;
// //       console.log('\n<><><><><><><> HTTP POST RESULT <><><><><><><>\n', result);
// //     }).catch((err) => {
// //       const metadata = { userText: 'hello' };
// //       handleAppError({ err, metadata, ship: false, scope: 'testing_newRelaese' });
// //     });
// //   }, 5000);

// //   setTimeout(async () => {
// //     console.log('\n<><><><><><><> HTTP GET <><><><><><><>\n');
// //     await axios({
// //       method: 'GET',
// //       url: 'http://respondto.it/',
// //     }).then((result) => {
// //       result = result.data;
// //       console.log('\n<><><><><><><> HTTP GET RESULT <><><><><><><>\n', result);
// //     }).catch((err) => {
// //       handleAppError({ err, ship: false, scope: 'testing_newRelaese' })
// //     });
// //   }, 10000);


// //   // setTimeout(async () => {
// //   //   await axios({
// //   //     method: 'POST',
// //   //     headers: { 'content-type': 'application/json' },
// //   //     url: process.env.oriNlpUrl + '/results',
// //   //     data: { message: 'hello', modelName: process.env.oriNlpModelName },
// //   //   }).then((result) => {
// //   //     result = result.data;
// //   //     console.log('\n<><><><><><><> HTTP POST <><><><><><><>\n', result);
// //   //   }).catch((err) => {
// //   //     const metadata = { userText = 'hello' };
// //   //     handleAppError({ err, metadata, ship = false, scope = 'testing_newRelaese' });
// //   //   });
// //   // }, 15000);

// //   setTimeout(async () => {
// //     console.log('\n<><><><><><><> HTTPS GET <><><><><><><>\n');
// //     await axios({
// //       method: 'GET',
// //       url: 'https://web.vodafone-elb.oriserve.in',
// //     }).then((result) => {
// //       result = result.data;
// //       console.log('\n<><><><><><><> HTTPS GET RESULT <><><><><><><>\n', result);
// //     }).catch((err) => {
// //       handleAppError({ err, ship: false, scope: 'testing_newRelaese' });
// //     });
// //   }, 15000);


// {
//     "mappings": {
//       "properties": {
//         "description": {
//           "type": "text",
//           "fields": {
//               "keyword": {
//                   "type": "keyword",
//                   "ignore_above": 1024
//               }
//           }
//         }
//       }
//     }
//   }

//
// setTimeout(async () => {
//     const log = {};
//     console.log('\n\n\nenableCloudMetadata----->', enableCloudMetadata);
//     console.log('cachedCloudMetadata----->', cachedCloudMetadata);
//     if(enableCloudMetadata) log['cloud-meta-data'] = cachedCloudMetadata ? cachedCloudMetadata : await getCloudMetadata(cloudType);
//     console.log('log after adding meta----------->', log);
//     console.log('\n\n\n');
// }, 2000);

// setTimeout(async () => {
//     const log = {};
//     console.log('\n\n\nenableCloudMetadata----->', enableCloudMetadata);
//     console.log('cachedCloudMetadata----->', cachedCloudMetadata);
//     if(enableCloudMetadata) log['cloud-meta-data'] = cachedCloudMetadata ? cachedCloudMetadata : await getCloudMetadata(cloudType);
//     console.log('log after adding meta----------->', log);
//     console.log('\n\n\n');
// }, 5000);


//old monkey patch for http/https

                        /*
                        // const requestStart = Date.now();
                        // function newCallback() {
                        //     try {
                        //         console.log('\n\n\n\n\n\n\n\n\n\n\n<><><> REQ response callback <><><>\n\n\n\n\n\n\n\n\n\n\n');
                        //         let responseBody;
                        //         let responseSize = -1;
                        //         const requestLogObject = {};
                        //         const responseLogObject = {};
                        //         const req = arguments[0].req; //OutgoingMessage (ClientRequest)
                        //         const res = arguments[0]; //IncomingMessage (ServerResponse)
                        //         // console.log('<><><> ARGUMENTS <><><>', req);

                        //         const ipPorts = urls.map(url => { return url.split("//")[1] });
                        //         const ips = ipPorts.map(ipPort => { return ipPort.split(":")[0] });
                        //         const hostname = (options && options.href) ? options.href : (options && options.hostname) ? options.hostname : null;
                        //         console.time('======= start =======');
                        //         if (hostname && !ips.includes(hostname)) {
                        //             if (debug) console.log('\n<><><><> DEBUG <><><><>\nRequest Hostname: ', hostname, '\nElastic-Kibana IPs/URLs: ', ips, '\n<><><><> DEBUG <><><><>\n');
                        //             // if (res.headers && res.headers['content-length']) {
                        //             //     responseSize = Number(res.headers['content-length']);
                        //             // } else {
                        //                 const chunks = [];
                        //                 res.on('data', (data) => {
                        //                     try {
                        //                         console.log('<><><> RES DATA <><><>');
                        //                         // if (data && Buffer.isBuffer(data)) {
                        //                         if (data) {
                        //                             responseSize += data.length;
                        //                             chunks.push(Buffer.from(data));
                        //                             delete data;
                        //                         }
                        //                     } catch (err) {

                        //                     }
                        //                 });
                        //                 res.on('end', (data) => {
                        //                     try {
                        //                         console.log('<><><> RES END <><><>');
                        //                         // if (data && Buffer.isBuffer(data)) {
                        //                         if (data) {
                        //                             chunks.push(Buffer.from(data));
                        //                         }
                        //                         responseBody = Buffer.concat(chunks).toString('utf8');
                        //                         console.log('RES CHUNK: ', data, 'RES BODY:', responseBody);
                        //                     } catch (err) {

                        //                     }
                        //                 });
                        //             // }

                        //             res.on('close', () => {
                        //                 requestLogObject.href = options.href ? options.href : options.hostname + options.path;
                        //                 requestLogObject.protocol = options?.protocol || '';
                        //                 requestLogObject.headers = options.headers ? options.headers : {};
                        //                 requestLogObject.method = options.method ? options.method : '';
                        //                 requestLogObject.requestStart = requestStart;

                        //                 responseLogObject.headers = res.headers;
                        //                 responseLogObject.statusCode = res.statusCode;
                        //                 responseLogObject.responseSize = responseSize;
                        //                 // responseLogObject.body = getLogBody(requestLogObject.headers, null, responseLogObject.statusCode);
                        //                 //skip when headers contain transfer-encoding: 'chunked'
                        //                 // outBoundApiLogger({ requestLogObject, responseLogObject, microServiceName, brand_name, cs_env, batchSize, timezone, ship });
                        //             });

                        //         }
                        //         console.timeEnd('======= start =======');
                        //         if (callback) {
                        //             callback.apply(this, arguments);
                        //         }
                        //     } catch (err) {
                        //         errorHandler({ err, ship: false, scope: '@niccsj/elastic-logger.overwriteHttpProtocol.patch.object.request.newCallback' });
                        //     }
                        // };
                        // const req = original(options, newCallback);
                        */