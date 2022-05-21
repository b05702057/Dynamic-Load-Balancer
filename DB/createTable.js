//scrantonTable.js
const AWS = require("aws-sdk");
AWS.config.update({
  region: "local",
  endpoint: "http://localhost:8888"
});

var dynamodb = new AWS.DynamoDB();
var params = {
    TableName : "BasicStore",
    KeySchema: [
        { AttributeName: "Key", KeyType: "HASH"}, // partition key
],
    AttributeDefinitions: [
        { AttributeName: "Key", AttributeType: "S" }, // "S" stands for strings.
],
    ProvisionedThroughput: {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10,
    }
};
dynamodb.createTable(params, function(err, data) {
    if (err) {
        console.error("Error JSON.", JSON.stringify(err, null, 2));
    } else {
        console.log("Created table.", JSON.stringify(data, null, 2));
    }
});
