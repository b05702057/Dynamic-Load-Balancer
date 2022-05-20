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

// Maps slice to request count.
let slicesInfo = {};
let sortedSliceToServer = [
    {
        slice: {start: 10, end: 20},
        serverIndex: 0,
    },
    {
        slice: {start: 21, end: 40},
        serverIndex: 0,
    },
]; // TODO TESTING VALUES

// Initialize
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
    // Populates slicesInfo
    getLoadFromAppServers();

    // Do algorithm here


    sendUpdatedMappings(); 

}

function getLoadFromAppServers() {
    let newSlicesInfo = {};

    for (const [serverIdx, appServerClient] of appServerAxiosClients.entries()) { 
        appServerClient
        .get('/get-load-info')
        .then(function (response) {
            // handle success
            console.log(`Successfully got load from AS at index ${serverIdx}:`);
            console.log(response.data);
            for (const [sliceSerialized, reqCount] of Object.entries(response.data)) {
                // Increment (or initialize to 0 then increment if not exist)
                newSlicesInfo[sliceSerialized] = (newSlicesInfo[sliceSerialized] || 0) + reqCount;
            }
        })
        .catch(function (error) {
            // handle error
            console.log(`Error getting load from AS at index ${serverIdx}`);
            console.log(error);
        });
    }

    // Update slicesInfo
    slicesInfo = newSlicesInfo;
    console.log('New slicesInfo is:' + JSON.stringify(slicesInfo));
}

// Can start with sending directly to front end
// Then can add rejection for retry in back ends if strong consistency is neede
function sendUpdatedMappings() {
    // Associative array of slices array (each elem is an array) the server at that idx is responsible for
    let serverToSlicesArray = new Array(appServerAddresses.length);
    
    // Initialize each nested array
    for (let i = 0; i < appServerAddresses.length; ++i) {
        serverToSlicesArray[i] = [];
    }
    
    // Populate appropriately from going through sortedSliceToServer
    for (const entry of sortedSliceToServer) {
        serverToSlicesArray[entry.serverIndex].push(entry.slice);
    }
    
    // TODO wait for max heap implemenation?
    for (const [serverIdx, serverClient] of appServerAxiosClients.entries()) {
        serverClient
        .post('/update-responsible-slices', {
            slicesArray: serverToSlicesArray[serverIdx]
        })
        .then(function (response) {
            // handle success
            console.log(`Successfully updated responsible slices for server ${serverIdx}:`);
            console.log(response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(`Error updating responsible slices for server ${serverIdx}`);
            console.log(error);
        });
    }

    for (const [frontEndIdx, frontEndClient] of frontEndAxiosClients.entries()) {
        frontEndClient
        .post('/update-shard-map', {
            sortedSliceToServer: sortedSliceToServer
        })
        .then(function (response) {
            // handle success
            console.log(`Successfully updated shard map for FE at index ${frontEndIdx}:`);
            console.log(response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(`Error updating shard map for FE at index ${frontEndIdx}`);
            console.log(error);
        });
    }
}

initialize();
setInterval(periodicMonitoringAndLoadBalancing, LOAD_BALANCING_INTERVAL_MILLISECONDS);