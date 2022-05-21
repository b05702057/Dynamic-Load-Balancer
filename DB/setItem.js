const AWS = require("aws-sdk");
const fs = require('fs');

function setItemWithKeyValue(dbClient, key, value) {
    var params = {
        TableName,
        Item: {
            "Key": key,
            "Value": value,
        }
    };
    dbClient.put(params, function(err, _data) {
        if (err) {
            console.error(err);
        } else {
            console.log("PutItem succeeded!");
        }
    });
}

const localRegion = "local";
let lines = fs.readFileSync('config.txt').toString().split("\n");
let region = lines[0].replace(/\s+/g, '');  // remove whitespace
let TableName = lines[1].replace(/\s+/g, '');  // remove whitespace
let jsonFile = lines[2].replace(/\s+/g, '');  // remove whitespace
let endpoint = "";
if (region === localRegion) {
    endpoint = lines[3].replace(/\s+/g, '');  // remove whitespace
}

AWS.config.update({
    region,
    endpoint
});

var docClient = new AWS.DynamoDB.DocumentClient();
let basicStoreData = JSON.parse(fs.readFileSync(jsonFile, 'utf8')); // parse the json file
basicStoreData.forEach(function(data) {
    setItemWithKeyValue(docClient, data.Key, data.Value);
});
