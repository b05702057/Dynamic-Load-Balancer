var AWS = require("aws-sdk");
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

var dynamodb = new AWS.DynamoDB(); // low-level client
var params = { TableName };

dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
