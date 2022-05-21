var AWS = require("aws-sdk");
AWS.config.update({
    region: "local",
    endpoint: "http://localhost:8888"
  });

var dynamodb = new AWS.DynamoDB(); // low-level client
var params = { TableName : "BasicStore" };

dynamodb.deleteTable(params, function(err, data) {
    if (err) {
        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
