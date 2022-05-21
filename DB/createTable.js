const AWS = require("aws-sdk");
const fs = require('fs');

const localRegion = "local";
let lines = fs.readFileSync('config.txt').toString().split("\n");
let region = lines[0].replace(/\s+/g, '');  // remove whitespace
let TableName = lines[1].replace(/\s+/g, '');  // remove whitespace
let endpoint = "";
if (region === localRegion) {
    endpoint = lines[3].replace(/\s+/g, '');  // remove whitespace
}

AWS.config.update({
  region,
  endpoint
});

var dynamodb = new AWS.DynamoDB();
var params = {
    TableName,
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
