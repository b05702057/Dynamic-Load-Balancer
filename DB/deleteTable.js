var AWS = require('aws-sdk');
// Set the region 
AWS.config.update({region: 'us-west-2'});

// Create the DynamoDB service object
var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});


async function test223BOperation(key, value) {
    // Delete table
    try {
        // Call DynamoDB to delete the specified table
        let delParams = {
            TableName: "CSE223B_KEY_VALUE_TABLE"
        };
        // Call DynamoDB to create the table
        const ddbCreateRes = await ddb.deleteTable(delParams).promise();
        console.log("Successful deleted table in dynamodb");
        console.log(ddbCreateRes);
    } catch (err) {
        if (err && err.code === 'ResourceNotFoundException') {
            console.log("Error: Table not found");
        } else if (err && err.code === 'ResourceInUseException') {
            console.log("Error: Table in use");
        } else {
            console.log("Success", data);
        }
    }
}
  
test223BOperation("some_key", "some_value")
    .then((data) => console.log("done 223bOperation"))
    .catch((err) => {
        console.log("function uncaught error");
        console.log(err)
    });