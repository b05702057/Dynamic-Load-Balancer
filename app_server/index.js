const   express     = require('express'),
	    bodyParser  = require('body-parser'),
        path        = require('node:path'),
        osu         = require('node-os-utils'),
        Hub         = require('cluster-hub')
        util        = require('util'),
        redis       = require('redis'),
        farmhash    = require('farmhash'),
        https       = require('https'),
        AWS         = require('aws-sdk');




const commandLineArgs = require('minimist')(process.argv.slice(2));

if (process.argv.length < 3 || commandLineArgs.port === undefined) {
    console.error("ERROR: Missing port argument");
    console.log("Example usage: node index.js --port <port_num>");
    process.exit(1);
}
const serverPort = parseInt(commandLineArgs.port);
console.log(serverPort);
    
var createRedisClient = redis.createClient;

var hub = new Hub();
var cpu = osu.cpu;

const cluster = require('cluster');

const totalNumCPUs = require("os").cpus().length;


const CONNECTION_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 15000;
const REQUEST_LOAD_HUB_MESSAGE = 'requestLoad';
const UPDATE_RESPONSIBLE_SLICES_HUB_MESSAGE = 'updateResponsibleSlices';

const REDIS_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 10000;
const REDIS_CONNECTION_TIMEOUT_MILLISECONDS = 1800;
const REDIS_EXPIRE_KEY_TTL_SECONDS = 20;

const DYNAMODB_CLIENT_KEEP_ALIVE_MSECS = 20000;  // delay for initial keep alive probe
// Set region
AWS.config.update({region: 'us-west-2'});


const httpsAgent = new https.Agent({
    keepAlive: true, 
    keepAliveMsecs: DYNAMODB_CLIENT_KEEP_ALIVE_MSECS,
    maxSockets: 100
});
const ddb = new AWS.DynamoDB({
    httpOptions: {
        httpsAgent
    }
});


if (cluster.isMaster) {
    console.log(`Total num cpus: ${totalNumCPUs}`);
    console.log(`Master pid is: ${process.pid}`);

    let workers = [];

    // Spawn worker at index 'i'.
    let spawn = function(i) {
        workers[i] = cluster.fork();

        // If worker dies, spawn it again
        workers[i].on('exit', function(code, signal) {
            // console.log('respawning worker', i);
            spawn(i);
        });

        // // Check for load request message
        // workers[i].on('message', function(msg) {
        //     // Only intercept messages that have a requestLoad property
        //     if (msg.requestLoad) {
        //         console.log('Worker to master: ');
        //         console.log(msg);

        //         // Send to all workers the msg containing newNamespace
        //         for (var j = 0; j < totalNumCPUs; j++) {
        //             workers[j].send(msg);
        //         }
                
        //     }
        // });
    };

    // Spawn workers
    for (var i = 0; i < totalNumCPUs; i++) {
        spawn(i);
    }

    function hubRequestWorkerRequestLoadPromise(hub, worker) {
        return new Promise((resolve, reject) => {
            hub.requestWorker(worker, REQUEST_LOAD_HUB_MESSAGE, {}, (err, workerRes) => {
                if (err) return reject(err);
                resolve(workerRes);
            });
        })
    }

    // Aggregate slices request counts
    hub.on(REQUEST_LOAD_HUB_MESSAGE, function (data, sender, callback) {
        let all_promises = [];
        for (const worker of workers) {
            all_promises.push(hubRequestWorkerRequestLoadPromise(hub, worker));
        }

        let aggregatedSliceReqCounts = {};
        
        Promise.all(all_promises)
        .then((allWorkersSliceReqCounts) => {
            for (const sliceReqCounts of allWorkersSliceReqCounts) {
                for (const [sliceSerialized, reqCount] of Object.entries(sliceReqCounts)) {
                    // Increment (or initialize to 0 then increment if not exist)
                    aggregatedSliceReqCounts[sliceSerialized] = (aggregatedSliceReqCounts[sliceSerialized] || 0) + reqCount;
                }
            }

            callback(null, aggregatedSliceReqCounts);
        })
        .catch((err) => {
            callback(err, "ERROR in getting load!");
        });
    });

    function hubRequestWorkerUpdateResponsibleSlicesPromise(hub, data, worker) {
        return new Promise((resolve, reject) => {
            hub.requestWorker(worker, UPDATE_RESPONSIBLE_SLICES_HUB_MESSAGE, data, (err, workerRes) => {
                if (err) return reject(err);
                resolve(workerRes);
            });
        })
    }

    hub.on(UPDATE_RESPONSIBLE_SLICES_HUB_MESSAGE, function (data, sender, callback) {
        let all_promises = [];
        for (const worker of workers) {
            all_promises.push(hubRequestWorkerUpdateResponsibleSlicesPromise(hub, data, worker));
        }
        
        Promise.all(all_promises)
        .then((values) => {
            callback(null, "success in updating responsible slices!");
        })
        .catch((err) => {
            callback(err, "ERROR in updating responsible slices!");
        });
    });

} else {
    console.log(`Worker with pid: ${process.pid} running`);

    
    // Maps slice to request count
    let slicesInfo = {};
    // Vector of sorted slices this server is responsible for
    let sortedResponsibleSlices = [];

    // TODO TESTING
    let dummySlice = {start: 10, end: 20};
    slicesInfo[JSON.stringify(dummySlice)] = 200; // TODO TESTING


    // Create and connect redis client
    const redisClient = createRedisClient({
        socket: {
            keepAlive: REDIS_KEEP_ALIVE_TIMEOUT_MILLISECONDS,
            connectTimeout: REDIS_CONNECTION_TIMEOUT_MILLISECONDS,
        }
    });

    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.connect().then((data) => {
        console.log("Successfuly connected redis client");
    }).catch((err) => {
        console.log("Error connecting to redis client");
        console.log(err);
    });
  

    hub.on(REQUEST_LOAD_HUB_MESSAGE, function (data, sender, callback) {
        callback(null, slicesInfo);
    });

    hub.on(UPDATE_RESPONSIBLE_SLICES_HUB_MESSAGE, function (data, sender, callback) {
        let newSlicesInfo = {};
        let newSortedResponsibleSlices = [];
        // Initialize to 0 and push to sortedResponsibleSlices array
        for (const slice of data.slicesArray) {
            newSlicesInfo[JSON.stringify(slice)] = 0;
            newSortedResponsibleSlices.push(slice);
        };

        newSortedResponsibleSlices.sort((slice_a, slice_b) => {slice_a.start - slice_b.start});

        // Reset data structures
        slicesInfo = newSlicesInfo;
        sortedResponsibleSlices = newSortedResponsibleSlices;

        console.log(`Worker ${process.pid} updated slicesInfo and sortedResponsibleSlices`);
        // console.log(slicesInfo);
        // console.log(sortedResponsibleSlices);

        callback(null, "Worker successfully updated responsible slices");
    });


    // Returns the slice object reference in sortedResponsibleSlices in which the hashedKeyInt belongs.
    // If no range contains hashedKeyInt, then returns null.
    function findSliceForKey(sortedResponsibleSlices, hashedKeyInt) {
        let startIdx = 0;
        let endIdx = sortedResponsibleSlices.length - 1;

        while (startIdx <= endIdx) {
            const mid = Math.floor((startIdx + endIdx) / 2);
            if (hashedKeyInt >= sortedResponsibleSlices[mid].start && hashedKeyInt <= sortedResponsibleSlices[mid].end) {
                return sortedResponsibleSlices[mid];
            } else if (hashedKeyInt > sortedResponsibleSlices[mid].end) {
                startIdx = mid + 1;
            } else if (hashedKeyInt < sortedResponsibleSlices[mid].start) {
                endIdx = mid - 1;
            } else {
                console.log('ERROR: NOT SUPPOSED TO BE HERE!');
                break;
            }
        }

        return null;
    }

    const app = express();
    
    // app.use statements go here

    app.use(bodyParser.json()); // handle json data, needed for axios requests to put things in req.body
    app.use(bodyParser.urlencoded({extended: true}));

    app.set('views', path.join(__dirname, 'views'))
    app.set('view engine', 'ejs')
    
    let userArr = [
        {
            id: "1",
            username: 'FooUser',
            title: 'Mr.'
        },

        {
            id: "2",
            username: 'BarUser',
            title: 'Ms.'
        },
        {
            id: "3",
            username: 'FooBarUser',
            title: 'Sir'
        }
    ];

    // app.get('/', (req, res) => {
    //     console.log(`Worker ${process.pid} serving root`);

    //     res.send('<h1>ROOT ROUTE!</h1>');
    // });

    // app.get('/list-users', (req, res) => {
    //     console.log(`Worker ${process.pid} serving get list-users`);
    //     res.render('./index', { userArr });
    // });

    // app.get('/user-info/:userId', (req, res) => {
    //     const { userId } = req.params;

    //     console.log(`Worker ${process.pid} serving user-info userId: ${userId}`);

    //     const user = userArr.find(user => user.id === userId);
    //     res.send(user);
    // });


    // app.get('/add-user', (req, res) => {
    //     console.log(`Worker ${process.pid} serving get add-user`);

    //     res.render('./add_user');
    // });

    // app.post('/add-user', (req, res) => {
    //     console.log(`Worker ${process.pid} serving post add-user`);

    //     const { title, username } = req.body;

    //     const foundUser = userArr.find(user => user.username === username);
    //     if (typeof foundUser === 'undefined') {
    //         userArr.push({
    //             id: userArr.length,
    //             username: username,
    //             title: title
    //         });
    //         res.redirect('/list-users');
    //     } else {
    //         res.send("ERROR: USER ALREADY EXISTS!");
    //     }
    // });

    app.post('/long-computation/', (req, res) => {
        // console.log(`Worker ${process.pid} serving long-computation`);

        const { key } = req.body;

        // console.log(req.body);

        // Make sure that key slice find and updating request count does not 
        // happen across any async point to avoid using locks.

        // Check that this server is indeed responsible for the slice containing the
        // hashed key
        const hashedKeyInt = farmhash.fingerprint32(key);
        const slice = findSliceForKey(sortedResponsibleSlices, hashedKeyInt);
        if (slice === null) {
            // Use code 410 for this
            res.status(410).send({
                message: 'This server is not responsible for the slice serving this key'
            });
            return;
        }

        // Increment request count for that slice
        // If there is error here (e.g. element is undefined) means that we didnt update both
        // slicesInfo and sortedResponsibleSlices correctly (inconsistent view)
        slicesInfo[JSON.stringify(slice)] += 1;

        let N = 1000;  // constant for testing

        let sum = 0;

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                sum += i * j;
            }
        }

        res.send({sum});
    });


    app.post('/kv-request', async (req, res) => {
        // console.log(`Worker ${process.pid} serving kv-request`);

        const { requestType, key, value } = req.body;

        // console.log(req.body);

        // Make sure that key slice find and updating request count does not 
        // happen across any async point to avoid using locks.

        // Check that this server is indeed responsible for the slice containing the
        // hashed key
        const hashedKeyInt = farmhash.fingerprint32(key);
        const slice = findSliceForKey(sortedResponsibleSlices, hashedKeyInt);
        if (slice === null) {
            // Use code 410 for this
            res.status(410).send({
                message: 'This server is not responsible for the slice serving this key'
            });
            return;
        }

        // Increment request count for that slice
        // If there is error here (e.g. element is undefined) means that we didnt update both
        // slicesInfo and sortedResponsibleSlices correctly (inconsistent view)
        slicesInfo[JSON.stringify(slice)] += 1;
        
        if (requestType === "get") {
            try {
                const gotValue = await redisClient.get(key);
                // If not in redis (got null), fetch from dynamodb
                if (gotValue === null) {
                    try {
                        var params = {
                            TableName: 'CSE223B_KEY_VALUE_TABLE',
                            Key: {
                                'KEY': {S: key},
                            },
                            // ProjectionExpression: 'VALUE'
                        };
                        // Call DynamoDB to get the item from table
                        const ddbGetRes = await ddb.getItem(params).promise();
                        // console.log("Successful getItem from dynamodb");
                        // console.log(ddbGetRes);
                        res.send(ddbGetRes);

                        // Update redis cache, no need to wait for completion (hence 
                        // doing after sending res)
                        if (ddbGetRes.Item !== undefined && ddbGetRes.Item.VALUE !== undefined && ddbGetRes.Item.VALUE.S !== undefined)  {
                            // console.log("UPDATING CACHE here!");
                            let valueGotFromDDB = ddbGetRes.Item.VALUE.S;
                            redisClient.set(key, valueGotFromDDB, {EX: REDIS_EXPIRE_KEY_TTL_SECONDS});
                        } else {
                            console.log("WARNING: Item was not set in ddb? Likely got empty object.");
                        }
                    } catch (err) {
                        console.log("Error getting from dynamodb (or updating redis cache)");
                        console.log(err);
                    }
                    
                } else {
                    // Key was in cache.
                    // console.log("gotvalue: ", gotValue);

                    try {
                        // console.log("Updating expire ttl");
                        redisClient.expire(key, REDIS_EXPIRE_KEY_TTL_SECONDS);
                    } catch (err) {
                        // Not crucial if error updating expiry
                        console.log("Error updating key expire tll"); 
                    }

                    res.send(gotValue);
                }
            } catch (err) {
                res.status(500).send({
                    message: 'Error: failed while trying redis get'
                });
            }
        } else if (requestType === "set") {
            // Set in dynamo first before setting in redis cache
            try {
                var params = {
                    TableName: 'CSE223B_KEY_VALUE_TABLE',
                    Item: {
                        'KEY' : {S: key},
                        'VALUE' : {S: value}
                    }
                };
                // Call DynamoDB to add the item to the table
                const ddbPutRes = await ddb.putItem(params).promise();
                // console.log("Successful putItem in dynamodb");
                // console.log(ddbPutRes);
            } catch (err) {
                console.log("Error putting in dynamodb");
                console.log(err);
                res.status(500).send({
                    message: 'Error: failed while trying putting in dynamodb'
                });

                return;
            }

            // Set in redis cache
            try {
                let ret = await redisClient.set(key, value, {EX: REDIS_EXPIRE_KEY_TTL_SECONDS});
                res.send(ret);
            } catch (err) {
                res.status(500).send({
                    message: 'Error: failed while trying redis set'
                });
            }

        } else {
            console.log("ERROR: Bad client request: invalid requestType");
            // Error code 400
            res.status(400).send({
                message: 'Error: invalid requestType'
            });
        }
    });

    app.post('/redis-flushall', async (req, res) => {
        console.log(`Worker ${process.pid} serving redis-flushall`);
        try {
            let flushRet = await redisClient.FLUSHALL();
            console.log(flushRet);
            if (flushRet === "OK") {
                res.send("Successfuly flushed all redis");
            } else {
                res.status(500).send({
                    message: 'Error flushing all redis'
                });
            }
        } catch(err) {
            console.log(err);
            res.status(500).send({
                message: 'Error flushing all redis'
            });
        }
    });

    // Only directly requested by controller
    app.get('/get-load-info', (req, res) => {
        console.log(`Worker ${process.pid} serving get-load`);

        // Communicate with all processes to aggregate slices req count info
        console.log('Sending hub requestLoad message to master');

        hub.requestMaster(REQUEST_LOAD_HUB_MESSAGE, {}, (err, masterRes) => {
            if (err !== null) {
                console.log('Error requesting load');
                console.log(err);
                // Error code 500
                res.status(500).send({
                    message: 'Error requesting load'
                });
            } else {
                console.log('Got response from master for getting request load:');
                console.log(masterRes);
                // Send back load
                res.send(masterRes);
            }
        });

        // We wont need this because by default we load balance on request rate.
        // TODO TESTING
        cpu.usage()
            .then(cpuPercentage => {
                console.log(`Current cpu usage % is ${cpuPercentage}`);
            });
    });

    // Only directly requested by controller
    app.post('/update-responsible-slices', (req, res) => {
        console.log(`Worker ${process.pid} serving /update-responsible-slices`);

        // Expects slicesArray to be array of objects (not serialized object strings)
        const { slicesArray } = req.body;

        // Data for hub communication
        const data = {
            slicesArray: slicesArray
        };

        // Communicate with master to tell all worker to update slices
        hub.requestMaster(UPDATE_RESPONSIBLE_SLICES_HUB_MESSAGE, data, (err, masterRes) => {
            if (err !== null) {
                console.log('Error updating responsible slices');
                console.log(err);
                // Error code 500
                res.status(500).send({
                    message: 'Error updating responsible slices'
                });
            } else {
                console.log('Got response from master for updating responsible slices:');
                console.log(masterRes);
                // Simply send success message (controller doesn't need data) for this request
                res.send(masterRes);
            }
        });
    });
    
    app.get('*', (req, res) => {
        console.log(`Worker ${process.pid} serving *`);

        res.send('<h1>CATCH ALL ROUTE!</h1>');
    });

    var server = app.listen(serverPort);
    server.keepAliveTimeout = CONNECTION_KEEP_ALIVE_TIMEOUT_MILLISECONDS;
    // server.headersTimeout = 31000; 
}
