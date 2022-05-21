var AWS = require('aws-sdk');
AWS.config.update({
    region: "local",
    endpoint: "http://localhost:8888"
});
var dynamodb = new AWS.DynamoDB();

var params = {
    TableName: 'BasicStore',
    Key: {
        "Key": {
            "S": "uEc"
        }
    },
};

dynamodb.getItem(params, function(err, data) {
    if (err) {
        console.log("Error", err);
    } else {
        console.log("Success", data.Item.Value);
    }
});
