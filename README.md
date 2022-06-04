# Installation guides
To install required dependencies, in the folder run:

    npm install

Install nodemon (nodemon refreshes server automatically when you save changes) globally: 

    npm i -g nodemon
    
Uninstall Artillery v2 if exists:

    npm uninstall -g artillery

Install Artillery v1 (may give error warning can ignore):

    npm i -g artillery@1.7.9


# Example Run
Example to run 3 app servers at http://localhost:8080/, http://localhost:8081/,
http://localhost:8082/, open different terminals/windows and run in app_server
folder:

    nodemon index.js --port 8080  # terminal 1
    nodemon index.js --port 8081  # terminal 2
    nodemon index.js --port 8082  # terminal 3

Run front end in front_end folder:

    nodemon index.js

Controller mode can be set by changing the variable:

    // false for dynamic load balancing. true for static/consistent hashing
    const CONSISTENT_HASHING_MODE = false; 

Run controller in controller folder:
    
    nodemon controller.js

Frontend and and app server addresses are in addresses_of_machines.txt. The 
first line list front end addresses, the second app servers. Whenever changes
are made, must manually restart front end and controller even if they were
run using nodemon since they read in these values during initialization.


# Load testing
Make sure using artillery v1 (see installation guides section).

Once addresses_of_machines.txt is populated appropriately, start app_servers and 
front_end. Then run controller. Wait 5 seconds for first mapping distribution.
Then can run artillery tests.

Run in load_testing folder:

    artillery run scenario_test.yml
    
You can create other .yml config file e.g. for testing long computations and run those.

Cutomized Artillery:

    node user_generator.js 
    
Run customized users:

    artillery run customized_test.yml  
    
# DynamoDB
download local DynamoDB here:
https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html#DynamoDBLocal.DownloadingAndRunning.title

DynamoDB

    cd DB

    npm install
    
    aws configure
    
    AWS Access Key ID: fakeMyKeyId
    
    AWS Secret Access Key: fakeSecretAccessKey
    
    Default region name:
    
    Default output format: 
    
Start DynamoDB:

    cd dynamodb_local_latest

    java -Djava.library.path=./DynamoDBLocal_lib -jar DynamoDBLocal.jar -sharedDb -port 8888
    
List Tables:
    
    aws dynamodb list-tables --endpoint-url http://localhost:8888
    
List Specific Table Entries:

    aws dynamodb scan --table-name BasicStore --endpoint-url http://localhost:8888
   
Local Experiments:
    Create Table:

        node createLocalTable.js

    Delete Table:

        node deleteLocalTable.js

    Get Items:

        node getLocalItem.js

    Set Items:

        node setLocalItem.js
    
Config a New Table before each Test:
    
    node createTable.js
    
# App_servers on AWS

install node:

    https://tecadmin.net/install-latest-nodejs-amazon-linux/
   
install git:

    sudo yum install git
    
install redis:

    https://redis.io/docs/getting-started/installation/install-redis-from-source/
    
   
Check Other resources:

https://axios-http.com/docs/api_intro 

https://nodejs.org/api/os.html

https://www.npmjs.com/package/memoryjs

https://www.npmjs.com/package/redis 

https://www.npmjs.com/package/mongodb


