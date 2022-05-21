//putScrantonData.js
const AWS = require("aws-sdk");
const fs = require('fs');
AWS.config.update({
    region: "local",
    endpoint: "http://localhost:8888"
});
var docClient = new AWS.DynamoDB.DocumentClient();

let basicStoreData = JSON.parse(fs.readFileSync('basicStoreData.json', 'utf8')); // parse the json file
basicStoreData.forEach(function(data) {
    console.log(data)
    var params = {
        TableName: "BasicStore",
        Item: {
            "Key": data.Key,
            "Value": data.Value,
        }
    };
        
    docClient.put(params, function(err, data) {
        if (err) {
            console.error(err);
        } else {
            console.log("PutItem succeeded!");
        }
    });
});
