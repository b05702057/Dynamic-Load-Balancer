const axios = require('axios');
const http = require('node:http');


const LOAD_BALANCING_INTERVAL_MILLISECONDS = 5000;
const AXIOS_CLIENT_TIMEOUT = 3000;
const CLIENT_KEEP_ALIVE_MSECS = 20000;


const frontEndAddresses = ['http://localhost:3000/'];
const appServerAddresses = ['http://localhost:8080/'];

let frontEndAxiosClients = new Array(frontEndAddresses.length);
let appServerAxiosClients = new Array(appServerAddresses.length);

http.globalAgent.maxSockets = 200;  // Max concurrent request for each axios instance

// Initialize clients data structures
function initialize() {
 
    for (let i = 0; i < frontEndAxiosClients.length; i++) {
        frontEndAxiosClients[i] = axios.create({
            baseURL: frontEndAddresses[i],
            timeout: AXIOS_CLIENT_TIMEOUT,
            httpAgent: new http.Agent({ 
                keepAlive: true,
                keepAliveMsecs: CLIENT_KEEP_ALIVE_MSECS 
            }),
        });
    }

    for (let i = 0; i < appServerAxiosClients.length; i++) {
        appServerAxiosClients[i] = axios.create({
            baseURL: appServerAddresses[i],
            timeout: AXIOS_CLIENT_TIMEOUT,
            httpAgent: new http.Agent({ 
                keepAlive: true,
                keepAliveMsecs: CLIENT_KEEP_ALIVE_MSECS
            }),
        });
    }

}

function periodicMonitoringAndLoadBalancing() {
    getLoadFromAppServers();

    // Do algorithm here


    sendUpdatedShardMaps();

}

function getLoadFromAppServers() {
    for (let i = 0; i < appServerAxiosClients.length; i++) {
        appServerAxiosClients[i]
        .get('/get-load-info')
        .then(function (response) {
            // handle success
            console.log(`Successfully got load from AS at index ${i}:`);
            console.log(response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(`Error getting load from AS at index ${i}`);
            console.log(error);
        });
    }
}

// Can start with sending directly to front end
// Then can add rejection for retry in back ends if strong consistency is neede
function sendUpdatedShardMaps() {
    for (let i = 0; i < frontEndAxiosClients.length; i++) {
        frontEndAxiosClients[i]
        .get('/update-shard-map')
        .then(function (response) {
            // handle success
            console.log(`Successfully updated shard map for FE at index ${i}:`);
            console.log(response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(`Error updating shard map for FE at index ${i}`);
            console.log(error);
        });
    }
}

initialize();
setInterval(periodicMonitoringAndLoadBalancing, LOAD_BALANCING_INTERVAL_MILLISECONDS);