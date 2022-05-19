const   express     = require('express'),
	    bodyParser  = require('body-parser'),
        path        = require('node:path'),
        axios = require('axios');


const cluster = require('cluster');

const totalNumCPUs = require("os").cpus().length;

const serverPort = 3000;


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
} else {
    console.log(`Worker with pid: ${process.pid} running`);

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
        const { userId } = req.params;
        console.log(`Worker ${process.pid} serving user-info with userID ${userId}`);
         
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

    app.listen(serverPort);
}