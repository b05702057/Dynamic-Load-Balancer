var AWS = require('aws-sdk');
const fs = require('fs');

function getItemWithKey(db, key) {
    var params = {
        TableName,
        Key: {
            "Key": {
                "S": key
            }
        },
    };
    db.getItem(params, function(err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data.Item.Value);
        }
    });
}

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
getItemWithKey(dynamodb, "uEc");
