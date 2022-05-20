const   express     = require('express'),
	    bodyParser  = require('body-parser'),
        path        = require('node:path'),
        axios       = require('axios'),
        Hub         = require('cluster-hub'),
        http        = require('node:http');

var hub = new Hub();


const cluster = require('cluster');

const totalNumCPUs = require("os").cpus().length;
// const totalNumCPUs = 1;  // TODO testing

const serverPort = 3000;
const CONNECTION_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 15000;
const AXIOS_CLIENT_TIMEOUT = 3000;
const AXIOS_CLIENT_KEEP_ALIVE_MSECS = 20000;

const UPDATE_SHARD_MAP_HUB_MESSAGE = 'updateShardMap';


http.globalAgent.maxSockets = 200;  // Max concurrent request for each axios instance

const appServerAddresses = ['http://localhost:8080/'];
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
    console.log(`Worker with pid: ${process.pid} running`);

    // Array of slice, server_id pair object. i.e "shard map"
    let sortedSliceToServer = [];

    // Update shard map
    hub.on(UPDATE_SHARD_MAP_HUB_MESSAGE, function (data, sender, callback) {
        sortedSliceToServer = data;
        console.log(`Worker ${process.pid} updated sortedSliceToServer: ` + JSON.stringify(sortedSliceToServer));
        
        callback(null, "worker updated!");
    });

    const app = express();
    
    // app.use statements go here

    app.use(bodyParser.json()); // handle json data, needed for axios requests to put things in req.body
    app.use(bodyParser.urlencoded({extended: true}));


    app.get('/', (req, res) => {
        console.log(`Worker ${process.pid} serving root`);
        
        axios.get('http://localhost:8080/')
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

    app.get('/list-users', (req, res) => {
        console.log(`Worker ${process.pid} serving get list-users`);

        axios.get('http://localhost:8080/list-users')
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

    app.get('/user-info/:userId', (req, res) => {
        console.log(`Worker ${process.pid} serving user-info`);

        const { userId } = req.params; 
        axios.get(`http://localhost:8080/user-info/${userId}`)
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


    app.get('/add-user', (req, res) => {
        console.log(`Worker ${process.pid} serving get add-user`);

        axios.get('http://localhost:8080/add-user')
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

    app.post('/add-user', (req, res) => {
        console.log(`Worker ${process.pid} serving post add-user`);

        const { title, username } = req.body;

        axios({
            method: 'post',
            url: 'http://localhost:8080/add-user',
            data: {
                title: title,
                username: username
            }
        })
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
            console.log("here");
        });
    });

    app.get('/long-computation/:N', (req, res) => {
        console.log(`Worker ${process.pid} serving long-computation`);

        const { N } = req.params;

        axios.get(`http://localhost:8080/long-computation/${N}`)
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

    app.post('/kv-request', async (req, res) => {
        console.log(`Worker ${process.pid} serving kv-request`);

        const { requestType, key, value } = req.body;

        console.log(req.body);
        
        // TODO now using the only client but should use mapping calculations later
        appServerAxiosClients[0].post('/kv-request', {
            requestType: requestType,
            key: key,
            value: value
        }).then(function (response) {
            res.send(response.data);
        })
        .catch(function (error) {
            console.log(error);
            // For now just senjd generic 500 error to client
            res.status(500).send({
                message: 'Some error'
            });
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