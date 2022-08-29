# Dynamic-Load-Balancer

### A Slicer-like load balancer that can balance the load dynamically to prevent servers from getting too hot

## Task
Implemented a Slicer-like algorithm to move the load away when a server is too hot and merge the slices when a server is too cold

### General Node packages Installation guides
To install required dependencies, in the folder run:

    npm install

Install nodemon (nodemon refreshes server automatically when you save changes) globally: 

    npm i -g nodemon
    

### Example Starting of Servers
Example to run 3 app servers locally at http://localhost:8080/, 
http://localhost:8081/, http://localhost:8082/, open different 
terminals/windows and run in app_server folder:

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

### IMPORTANT
Frontend and and app server addresses are in addresses_of_machines.txt. The 
first line list front end addresses, the second app servers. Entries in
each list should be comma separated. Whenever changes are made, must manually 
restart front end and controller even if they were run using nodemon since 
they read in these values during initialization.

Addresses in addresses_of_machines.txt need to be consistent across controller 
and front ends to have consistent view of app servers, since indices are used.


## Load testing
### Setting Up
Make sure addreses_of_machines.txt is ready (read previous section).

Front ends and app servers should be running first. Then start the controller.
Wait at least 5 seconds (or period of load balancing updates) for the initial
assignment of shard maps to be done before sending any requests / starting the
load test.

### Generating payload
Configure paramereters in user_generator.js and run it using node to gererate 
data written to the users.csv file, which is read in for load testing.

### Load testing with wrk2

Install wrk2:

    https://github-wiki-see.page/m/giltene/wrk2/wiki/Installing-wrk2-on-Linux
    https://github.com/giltene/wrk2


### Lua scripts
See example scripts longCompScript.lua and readLineByLine.lua for long
computations and key value test respectively.

Change the ip addresses in the "append" calls of the init function to the 
IP/port addresses of the front ends. To use all front ends, the number of 
threads to run wrk with must be at least the number of front ends (wraps 
around).

The number of threads specified in the customized_test.yml file should be equal
to number to run wrk with (see later). This should be done before generating 
the payload with user_generator.js.

Make sure the route endpoint is the one you want to test when setting the request 
function (e.g. request = function() etc.) in the script.


To run a test, specify the lua script file with -s and use one of the front
end's address as the target. Actual targets can be chosen using lua scripts. 
E.g.:

    wrk -t2 -c200 --timeout 15s --latency -s readLineByLine.lua -d360s -R3500 http://172.31.11.13:3000/

See wrk documentation for an explantion of those flags.


### Old load testing w/ artillery (deprecated)
Make sure using artillery v1

Uninstall Artillery v2 if exists:

    npm uninstall -g artillery

Install Artillery v1 (may give error warning can ignore):

    npm i -g artillery@1.7.9


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
    
### Redis
Only for key-value application test.

Have a redis server running on the default port 6379 on the application 
servers for the key value test. There is a "curl_request_redis_flushall.sh" 
script that can be run to clear redis storage for the destination app server 
addresses if needed--note this clears ALL redis storage, and may not be 
necessary since keys expire in 10 seconds anyway for our KV app.

### DynamoDB
Only for key-value application test.

Make sure AWS instance has access (e.g. IAM role) to DynamoDB. 

Need to create a table for the key-value tests. Simply run node createTable.js
in the DB folder which deletes the table if exists and then creates it; this
avoids previous tests' data from impacting the new test. The table name is
'CSE223B_KEY_VALUE_TABLE'.

### DynamoDBLocal (for local testing)
Download local DynamoDB here:
https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html#DynamoDBLocal.DownloadingAndRunning.title

DynamoDBLocal setup

    cd DB

    npm install
    
    aws configure
    
    AWS Access Key ID: fakeMyKeyId
    
    AWS Secret Access Key: fakeSecretAccessKey
    
    Default region name:
    
    Default output format: 
    
Start DynamoDB Local:

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
    
### Sample installation guides for App_servers on AWS if using Amazon Linux

install node:

    https://tecadmin.net/install-latest-nodejs-amazon-linux/
   
install git:

    sudo yum install git
    
install redis:

    https://redis.io/docs/getting-started/installation/install-redis-from-source/
    
