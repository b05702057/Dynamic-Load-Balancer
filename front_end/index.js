const   express     = require('express'),
	    bodyParser  = require('body-parser'),
        path        = require('node:path'),
        axios       = require('axios'),
        cluster     = require('cluster'),
        Hub         = require('cluster-hub'),
        http        = require('node:http'),
        farmhash    = require('farmhash'),
        fs          = require('fs');

var hub = new Hub();

const totalNumCPUs = require("os").cpus().length;
// const totalNumCPUs = 1;  // TODO testing

// Don't add whitespace here, rely on replace() regex for that
const MACHINE_ADDRESSES_SEPARATOR = ",";

const serverPort = 3000;
const CONNECTION_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 15000;
const AXIOS_CLIENT_TIMEOUT = 3000;
const AXIOS_CLIENT_KEEP_ALIVE_MSECS = 20000;

const UPDATE_SHARD_MAP_HUB_MESSAGE = 'updateShardMap';


http.globalAgent.maxSockets = 200;  // Max concurrent request for each axios instance


let appServerAddresses = [];

// Read in addresses
try {
    let lines = fs.readFileSync('../addresses_of_machines.txt').toString().split("\n");
    // lines[0]: front ends, lines[1]: app servers. Addresses are separated by comma and space ", "
    let appServerLine = lines[1].replace(/\s+/g, '');  // remove whitespace
    appServerAddresses = appServerLine.split(MACHINE_ADDRESSES_SEPARATOR);

    console.log("appServerAddresses:");
    console.log(appServerAddresses);
} catch (err) {
    console.error(err);
}


let appServerAxiosClients = new Array(appServerAddresses.length);
for (let i = 0; i < appServerAxiosClients.length; i++) {
    appServerAxiosClients[i] = axios.create({
        baseURL: appServerAddresses[i],
        timeout: AXIOS_CLIENT_TIMEOUT,
        httpAgent: new http.Agent({ 
            keepAlive: true,
            keepAliveMsecs: AXIOS_CLIENT_KEEP_ALIVE_MSECS
        }),
    });
}


if (cluster.isMaster) {
    console.log('Starting front end');
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

        // TODO: use this for IPC if needed
        // // Check for new namespace message
        // workers[i].on('message', function(msg) {
        //     // Only intercept messages that have a newNamespaceEndpoint property
        //     if (msg.newNamespaceEndpoint) {
        //         console.log('Worker to master: ');
        //         console.log(msg);

        //         // Send to all workers the msg containing newNamespace
        //         for (var j = 0; j < num_processes; j++) {
        //             workers[j].send(msg);
        //         }
                
        //     }
        // });
    };

    // Spawn workers
	for (var i = 0; i < totalNumCPUs; i++) {
		spawn(i);
	}

    function hubRequestWorkerUpdateShardMapPromise(hub, data, worker) {
        return new Promise((resolve, reject) => {
            hub.requestWorker(worker, UPDATE_SHARD_MAP_HUB_MESSAGE, data, (err, workerRes) => {
                if (err) return reject(err);
                resolve(workerRes);
            });
        })
    }

    hub.on(UPDATE_SHARD_MAP_HUB_MESSAGE, function (data, sender, callback) {
        let all_promises = [];
        for (const worker of workers) {
            all_promises.push(hubRequestWorkerUpdateShardMapPromise(hub, data, worker));
        }
        
        Promise.all(all_promises)
        .then((values) => {
            callback(null, "success in updating shard maps!");
        })
        .catch((err) => {
            callback(err, "ERROR in updating shard map!");
        });
    });
} else {
    console.log(`Front end worker with pid: ${process.pid} running`);

    // Array of slice, server_id pair object. i.e "shard map"
    let sortedSliceToServer = [];

    // Update shard map
    hub.on(UPDATE_SHARD_MAP_HUB_MESSAGE, function (data, sender, callback) {
        sortedSliceToServer = data;
        console.log(`Worker ${process.pid} updated sortedSliceToServer: ` + JSON.stringify(sortedSliceToServer));
        
        callback(null, "worker updated!");
    });

    // Returns the {slice, serverIndex} pair object reference in sortedSliceToServer in which the hashedKeyInt belongs.
    // If no range contains hashedKeyInt, then returns null.
    function findSliceAndServerObjForKey(sortedSliceToServer, hashedKeyInt) {
        let startIdx = 0;
        let endIdx = sortedSliceToServer.length - 1;

        while (startIdx <= endIdx) {
            const mid = Math.floor((startIdx + endIdx) / 2);

            if (hashedKeyInt >= sortedSliceToServer[mid].slice.start && hashedKeyInt <= sortedSliceToServer[mid].slice.end) {
                return sortedSliceToServer[mid];
            } else if (hashedKeyInt > sortedSliceToServer[mid].slice.end) {
                startIdx = mid + 1;
            } else if (hashedKeyInt < sortedSliceToServer[mid].slice.start) {
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


    // app.get('/', (req, res) => {
    //     console.log(`Worker ${process.pid} serving root`);
        
    //     axios.get('http://localhost:8080/')
    //     .then(function (response) {
    //         // handle success
    //         res.send(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(error);
    //     })
    //     .then(function () {
    //         // always executed
    //     });
    // });

    // app.get('/list-users', (req, res) => {
    //     console.log(`Worker ${process.pid} serving get list-users`);

    //     axios.get('http://localhost:8080/list-users')
    //     .then(function (response) {
    //         // handle success
    //         res.send(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(error);
    //     })
    //     .then(function () {
    //         // always executed
    //     });
    // });

    // app.get('/user-info/:userId', (req, res) => {
    //     const { userId } = req.params;
    //     console.log(`Worker ${process.pid} serving user-info with userID ${userId}`);
         
    //     axios.get(`http://localhost:8080/user-info/${userId}`)
    //     .then(function (response) {
    //         // handle success
    //         res.send(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(error);
    //     })
    //     .then(function () {
    //         // always executed
    //     });
    // });


    // app.get('/add-user', (req, res) => {
    //     console.log(`Worker ${process.pid} serving get add-user`);

    //     axios.get('http://localhost:8080/add-user')
    //     .then(function (response) {
    //         // handle success
    //         res.send(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(error);
    //     })
    //     .then(function () {
    //         // always executed
    //     });
    // });

    // app.post('/add-user', (req, res) => {
    //     console.log(`Worker ${process.pid} serving post add-user`);

    //     const { title, username } = req.body;

    //     axios({
    //         method: 'post',
    //         url: 'http://localhost:8080/add-user',
    //         data: {
    //             title: title,
    //             username: username
    //         }
    //     })
    //     .then(function (response) {
    //         // handle success
    //         res.send(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(error);
    //     })
    //     .then(function () {
    //         // always executed
    //         console.log("here");
    //     });
    // });
    
    app.post('/long-computation/', (req, res) => {
        // console.log(`Worker ${process.pid} serving long-computation`);
        
        const { key } = req.body;

        const hashedKeyInt = farmhash.fingerprint32(key);
        const sliceAndServerObj = findSliceAndServerObjForKey(sortedSliceToServer, hashedKeyInt);

        let appServerIndexToRoute = null;
        if (sliceAndServerObj === null) {
            res.status(500).send({
                message: 'ERROR: Cannot find a slice range containing the hashedKey. Shard map has holes?'
            });
            return;
        } else {
            appServerIndexToRoute = sliceAndServerObj.serverIndex;
        }

        // console.log("Key is: " + key + ", Server selected: " + appServerIndexToRoute.toString() + ", hashedKeyInt " + hashedKeyInt.toString());

        appServerAxiosClients[appServerIndexToRoute].post('/long-computation', {
            key: key,
        }).then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            console.log(error);
            // Forward error if status exists
            if (error.response !== undefined && error.response.status != undefined) {
                res.status(error.response.status).send({
                    message: error.response.data.message
                });
            } else {
                res.status(500).send({
                    message: "Unknown status for error!"
                });
            }
        });
    });


    app.post('/kv-request', async (req, res) => {
        // console.log(`Front end worker ${process.pid} serving kv-request`);

        const { requestType, key, value } = req.body;

        // console.log(req.body);

        // Find which server to route to by hashing key and checking shard map (sortedSliceToServer)

        // fingerprint32 returns a number which is an unsigned 32 bit integer. same result on all
        // platforms unlike hash32
        const hashedKeyInt = farmhash.fingerprint32(key);
        const sliceAndServerObj = findSliceAndServerObjForKey(sortedSliceToServer, hashedKeyInt);

        let appServerIndexToRoute = null;
        if (sliceAndServerObj === null) {
            res.status(500).send({
                message: 'ERROR: Cannot find a slice range containing the hashedKey. Shard map has holes?'
            });
            return;
        } else {
            appServerIndexToRoute = sliceAndServerObj.serverIndex;
        }

        // console.log("Key is: " + key + ", Server selected: " + appServerIndexToRoute.toString() + ", hashedKeyInt " + hashedKeyInt.toString());

        appServerAxiosClients[appServerIndexToRoute].post('/kv-request', {
            requestType: requestType,
            key: key,
            value: value
        }).then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            console.log(error);
            // Forward error if status exists
            if (error.response !== undefined && error.response.status != undefined) {
                res.status(error.response.status).send({
                    message: error.response.data.message
                });
            } else {
                res.status(500).send({
                    message: "Unknown status for error!"
                });
            }
        });
    });
    

    // Only directly requested by controller
    app.post('/update-shard-map', (req, res) => {
        console.log(`Worker ${process.pid} serving update-shard-map`);

        const { sortedSliceToServer } =  req.body;
        
        // Todo update shard maps of all processes
        hub.requestMaster(UPDATE_SHARD_MAP_HUB_MESSAGE, sortedSliceToServer, (err, masterRes) => {
            if (err !== null) {
                console.log('Error updating shard Map');
                console.log(err);

                // Error code 500
                res.status(500).send({
                    message: 'Error updating shard map'
                });
            } else {
                console.log('Got response from master: ');
                console.log(masterRes);
                res.send(masterRes);
            }
        });
    });

    app.get('*', (req, res) => {
        console.log(`Worker ${process.pid} serving *`);

        axios.get('http://localhost:8080/*')
        .then(function (response) {
            // handle success
            res.send(response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        })
        .then(function () {
            // always executed
        });
    });

    var server = app.listen(serverPort);
    server.keepAliveTimeout = CONNECTION_KEEP_ALIVE_TIMEOUT_MILLISECONDS;
    // server.headersTimeout = 31000; 
}