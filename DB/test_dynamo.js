var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-west-2'});

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


async function testOperation() {
    var createParams = {
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
    // Call DynamoDB to create the table
    ddb.createTable(createParams, function(err, data) {
    if (err) {
        console.log("Error", err);
    } else {
        console.log("Table Created", data);
    }
    });


    // // Call DynamoDB to delete the specified table
    // let delParams = {
    //     TableName: "CUSTOMER_LIST"
    // };
    // ddb.deleteTable(delParams, function(err, data) {
    //     if (err && err.code === 'ResourceNotFoundException') {
    //     console.log("Error: Table not found");
    //     } else if (err && err.code === 'ResourceInUseException') {
    //     console.log("Error: Table in use");
    //     } else {
    //     console.log("Success", data);
    //     }
    // });


    // // Listing up to 10 tables
    // ddb.listTables({Limit: 10}, function(err, data) {
    //     if (err) {
    //     console.log("Error", err.code);
    //     } else {
    //     console.log("Table names are ", data.TableNames);
    //     }
    // });


    // // Async put item version
    // try {
    //   var params = {
    //       TableName: 'CUSTOMER_LIST',
    //       Item: {
    //           'CUSTOMER_ID' : {N: '001'},
    //           'CUSTOMER_NAME' : {S: 'Richard Roe'}
    //       }
    //   };
    //   // Call DynamoDB to add the item to the table
    //   const ddbPutRes = await ddb.putItem(params).promise();
    //   console.log("Successful putItem in dynamodb");
    //   console.log(ddbPutRes);
    // } catch (err) {
    //     console.log("Error putting in dynamodb");
    //     console.log(err);

    //     res.status(500).send({
    //         message: 'Error: failed while trying dynamodb put'
    //     });
    // }


    // // Async get item version
    // try {
    //   var params = {
    //       TableName: 'CUSTOMER_LIST',
    //       Key: {
    //           'CUSTOMER_ID': {N: '001'},
    //           'CUSTOMER_NAME' : {S: 'Richard Roe'}
    //       },
    //       // ProjectionExpression: 'CUSTOMER_NAME'
    //   };
    //   // Call DynamoDB to get the item from table
    //   const ddbPutRes = await ddb.getItem(params).promise();
    //   console.log("Successful getItem from dynamodb");
    //   console.log(ddbPutRes);
    // } catch (err) {
    //     console.log("Error getting from dynamodb");
    //     console.log(err);

    //     res.status(500).send({
    //         message: 'Error: failed while trying dynamodb get'
    //     });
    // }
    

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

}

// testOperation()
//     .then((data) => console.log("done script"))
//     .catch((err) => {
//         console.log("function uncaught error");
//         console.log(err)
//     });



async function test223BOperation(key, value) {
    // // Create table
    // try {
    //     var createParams = {
    //         AttributeDefinitions: [
    //             {
    //                 AttributeName: 'KEY',
    //                 AttributeType: 'S'
    //             }
    //         ],
    //         KeySchema: [
    //             {
    //                 AttributeName: 'KEY',
    //                 KeyType: 'HASH'
    //             }
    //         ],
    //         // ProvisionedThroughput: {
    //         //     ReadCapacityUnits: 1,
    //         //     WriteCapacityUnits: 1
    //         // },
    //         BillingMode: 'PAY_PER_REQUEST',  // ON-DEMAND
    //         TableName: 'CSE223B_KEY_VALUE_TABLE',
    //         StreamSpecification: {
    //             StreamEnabled: false
    //         }
    //     };
    //     // Call DynamoDB to create the table
    //     const ddbCreateRes = await ddb.createTable(createParams).promise();
    //     console.log("Successful created table in dynamodb");
    //     console.log(ddbCreateRes);
    // } catch (err) {
    //     console.log("Error creating table in dynamodb");
    //     console.log(err);
    // }
    

    // // Delete table
    // try {
    //     // Call DynamoDB to delete the specified table
    //     let delParams = {
    //         TableName: "CSE223B_KEY_VALUE_TABLE"
    //     };
    //     // Call DynamoDB to create the table
    //     const ddbCreateRes = await ddb.deleteTable(delParams).promise();
    //     console.log("Successful deleted table in dynamodb");
    //     console.log(ddbCreateRes);
    // } catch (err) {
    //     if (err && err.code === 'ResourceNotFoundException') {
    //         console.log("Error: Table not found");
    //     } else if (err && err.code === 'ResourceInUseException') {
    //         console.log("Error: Table in use");
    //     } else {
    //         console.log("Success", data);
    //     }
    // }
    // Create table
    try {
        var createParams = {
            AttributeDefinitions: [
                {
                    AttributeName: 'KEY',
                    AttributeType: 'S'
                }
            ],
            KeySchema: [
                {
                    AttributeName: 'KEY',
                    KeyType: 'HASH'
                }
            ],
            // ProvisionedThroughput: {
            //     ReadCapacityUnits: 1,
            //     WriteCapacityUnits: 1
            // },
            BillingMode: 'PAY_PER_REQUEST',  // ON-DEMAND
            TableName: 'CSE223B_KEY_VALUE_TABLE',
            StreamSpecification: {
                StreamEnabled: false
            }
        };
        // Call DynamoDB to create the table
        const ddbCreateRes = await ddb.createTable(createParams).promise();
        console.log("Successful created table in dynamodb");
        console.log(ddbCreateRes);
    } catch (err) {
        console.log("Error creating table in dynamodb");
        console.log(err);
    }

    // // Listing up to 10 tables
    // ddb.listTables({Limit: 10}, function(err, data) {
    //     if (err) {
    //     console.log("Error", err.code);
    //     } else {
    //     console.log("Table names are ", data.TableNames);
    //     }
    // });


    // // Async put item version
    // try {
    //     var params = {
    //         TableName: 'CSE223B_KEY_VALUE_TABLE',
    //         Item: {
    //             'KEY' : {S: key},
    //             'VALUE' : {S: value}
    //         }
    //     };
    //     // Call DynamoDB to add the item to the table
    //     const ddbPutRes = await ddb.putItem(params).promise();
    //     console.log("Successful putItem in dynamodb");
    //     console.log(ddbPutRes);
    // } catch (err) {
    //     console.log("Error putting in dynamodb");
    //     console.log(err);
    // }


    // // Async get item version
    // try {
    //     var params = {
    //         TableName: 'CSE223B_KEY_VALUE_TABLE',
    //         Key: {
    //             'KEY': {S: key},
    //         },
    //         // ProjectionExpression: 'VALUE'
    //     };
    //     // Call DynamoDB to get the item from table
    //     const ddbGetRes = await ddb.getItem(params).promise();
    //     console.log("Successful getItem from dynamodb");
    //     console.log(ddbGetRes);
    // } catch (err) {
    //     console.log("Error getting from dynamodb");
    //     console.log(err);
    // }
    
    
    // // Delete items
    // var params = {
    //     TableName: 'CSE223B_KEY_VALUE_TABLE',
    //     Key: {
    //         'KEY': {S: key},
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
}
  
test223BOperation("some_key", "some_value")
    .then((data) => console.log("done 223bOperation"))
    .catch((err) => {
        console.log("function uncaught error");
        console.log(err)
    });
