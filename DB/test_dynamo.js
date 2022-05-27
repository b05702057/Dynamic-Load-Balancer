var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-west-2'});

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});

var params = {
  AttributeDefinitions: [
    {
      AttributeName: 'CUSTOMER_ID',
      AttributeType: 'N'
    },
    {
      AttributeName: 'CUSTOMER_NAME',
      AttributeType: 'S'
    }
  ],
  KeySchema: [
    {
      AttributeName: 'CUSTOMER_ID',
      KeyType: 'HASH'
    },
    {
      AttributeName: 'CUSTOMER_NAME',
      KeyType: 'RANGE'
    }
  ],
//   ProvisionedThroughput: {
//     ReadCapacityUnits: 1,
//     WriteCapacityUnits: 1
//   },
  BillingMode: 'PAY_PER_REQUEST',  // ON-DEMAND
  TableName: 'CUSTOMER_LIST',
  StreamSpecification: {
    StreamEnabled: false
  }
};

// // Call DynamoDB to create the table
// ddb.createTable(params, function(err, data) {
//   if (err) {
//     console.log("Error", err);
//   } else {
//     console.log("Table Created", data);
//   }
// });


// // Call DynamoDB to delete the specified table
// let delParams = {
//     TableName: "CUSTOMER_LIST"
// };
// ddb.deleteTable(delParams, function(err, data) {
//     if (err && err.code === 'ResourceNotFoundException') {
//       console.log("Error: Table not found");
//     } else if (err && err.code === 'ResourceInUseException') {
//       console.log("Error: Table in use");
//     } else {
//       console.log("Success", data);
//     }
//   });


// // Listing up to 10 tables
// ddb.listTables({Limit: 10}, function(err, data) {
//     if (err) {
//       console.log("Error", err.code);
//     } else {
//       console.log("Table names are ", data.TableNames);
//     }
//   });


// // Put items
// var params = {
//     TableName: 'CUSTOMER_LIST',
//     Item: {
//         'CUSTOMER_ID' : {N: '001'},
//         'CUSTOMER_NAME' : {S: 'Richard Roe'}
//     }
// };
// // Call DynamoDB to add the item to the table
// ddb.putItem(params, function(err, data) {
//     if (err) {
//         console.log("Error", err);
//     } else {
//         console.log("Success", data);
//     }
// });


// // Get items
// var params = {
//     TableName: 'CUSTOMER_LIST',
//     Key: {
//         'CUSTOMER_ID': {N: '001'},
//         'CUSTOMER_NAME' : {S: 'Richard Roe'}
//     },
//     // ProjectionExpression: 'CUSTOMER_NAME'
// };
// // Call DynamoDB to read the item from the table
// ddb.getItem(params, function(err, data) {
//     if (err) {
//         console.log("Error", err);
//     } else {
//         console.log("Success", data.Item);
//     }
// });


// // Delete items
// var params = {
//     TableName: 'CUSTOMER_LIST',
//     Key: {
//         'CUSTOMER_ID': {N: '001'},
//         'CUSTOMER_NAME' : {S: 'Richard Roe'}
//     },
// };
// // Call DynamoDB to delete the item from the table
// ddb.deleteItem(params, function(err, data) {
//     if (err) {
//         console.log("Error", err);
//     } else {
//         console.log("Success", data);
//     }
// });