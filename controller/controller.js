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

// Maps slice to request count
let slices_info = {};
let sorted_slice_to_server = ['test_1', 'test_2'];

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
    // Populates slices_info
    getLoadFromAppServers();

    // Do algorithm here


    sendUpdatedMappings(); 

}

function getLoadFromAppServers() {
    let new_slices_info = {};

    for (const [server_idx, appServerClient] of appServerAxiosClients.entries()) { 
        appServerClient
        .get('/get-load-info')
        .then(function (response) {
            // handle success
            console.log(`Successfully got load from AS at index ${server_idx}:`);
            console.log(response.data);
            for (const [slice, reqCount] of Object.entries(response.data)) {
                // Increment (or initialize to 0 then increment if not exist)
                new_slices_info[slice] = (new_slices_info[slice] || 0) + reqCount;
            }
        })
        .catch(function (error) {
            // handle error
            console.log(`Error getting load from AS at index ${server_idx}`);
            console.log(error);
        });
    }

    // Update slices_info
    slices_info = new_slices_info;
    console.log('New slices_info is:' + JSON.stringify(slices_info));
}

// Can start with sending directly to front end
// Then can add rejection for retry in back ends if strong consistency is neede
function sendUpdatedMappings() {

    // // TODO wait for max heap implemenation?
    // for (const [server_idx, serverClient] of appServerAxiosClients.entries()) {
    //     serverClient
    //     .post('/update-server-slices', server_slices[server_idx])
    //     .then(function (response) {
    //         // handle success
    //         console.log(`Successfully updated shard map for FE at index ${server_idx}:`);
    //         console.log(response.data);
    //     })
    //     .catch(function (error) {
    //         // handle error
    //         console.log(`Error updating shard map for FE at index ${server_idx}`);
    //         console.log(error);
    //     });
    // }

    for (const [frontEndIdx, frontEndClient] of frontEndAxiosClients.entries()) {
        frontEndClient
        .post('/update-shard-map', {
            sorted_slice_to_server: sorted_slice_to_server
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