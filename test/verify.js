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
