Right now front end will server at port 3000, app server at 8080.

To install required dependencies, in the folder run:

    npm install


Install nodemon (nodemon refreshes server automatically when you save changes) globally: 

    npm i -g nodemon
    
To run (app_server and front end):

    nodemon index.js

Artillery:

    npm i -g artillery
    
Run in load_testing folder:

    artillery run scenario_test.yml
    
You can create other .yml config file e.g. for testing long computations and run those.

Cutomized Artillery:

    node user_generator.js 
    
Run customized users:

    artillery run customized_test.yml  
    
DynamoDB:

    cd DB

    npm install
    
    aws configure
    
    AWS Access Key ID: fakeMyKeyId
    
    AWS Secret Access Key: fakeSecretAccessKey
    
    Default region name:
    
    Default output format: 
    
Start DynamoDB:

    java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -port 8888
    
List Tables:
    
    aws dynamodb list-tables --endpoint-url http://localhost:8888
    
List Specific Table Entries:

    aws dynamodb scan --table-name BasicStore --endpoint-url http://localhost:8888
    
Create Table:

    node createTable.js
    
Delete Table:

    node deleteTable.js
    
Get Items:

    node getItem.js

Set Items:

    node setItem.js
    
Check Other resources:

https://axios-http.com/docs/api_intro 

https://nodejs.org/api/os.html

https://www.npmjs.com/package/memoryjs

https://www.npmjs.com/package/redis 

https://www.npmjs.com/package/mongodb


