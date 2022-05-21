const axios = require('axios');
const http = require('node:http');
const { Heap } = require('heap-js'); 
const fs = require('fs');
const {
    setIntervalAsync,
    clearIntervalAsync
} = require('set-interval-async/dynamic');


// Don't add whitespace here, rely on replace() regex for that
const MACHINE_ADDRESSES_SEPARATOR = ",";

const LOAD_BALANCING_INTERVAL_MILLISECONDS = 5000;
const AXIOS_CLIENT_TIMEOUT = 3000;
const AXIOS_CLIENT_KEEP_ALIVE_MSECS = 20000;
const KEY_CHURN_LIMIT = 2000; 
const SLICES_LIMIT = 100; 

// 2^32 - 1
const KEYSPACE_MAX = 4294967295;

http.globalAgent.maxSockets = 200;  // Max concurrent request for each axios instance

let frontEndAddresses = [];
let appServerAddresses = [];

// Read in addresses
try {
    let lines = fs.readFileSync('../addresses_of_machines.txt').toString().split("\n");
    // lines[0]: front ends, lines[1]: app servers. Addresses are separated by comma and space ", "
    let frontEndLine = lines[0].replace(/\s+/g, '');  // remove whitespace
    let appServerLine = lines[1].replace(/\s+/g, '');  // remove whitespace
    frontEndAddresses = frontEndLine.split(MACHINE_ADDRESSES_SEPARATOR)
    appServerAddresses = appServerLine.split(MACHINE_ADDRESSES_SEPARATOR);

    console.log("appServerAddresses:");
    console.log(appServerAddresses);
} catch (err) {
    console.error(err);
}


let frontEndAxiosClients = new Array(frontEndAddresses.length);
let appServerAxiosClients = new Array(appServerAddresses.length);

const compareReqMaxH = (a, b) => {
    if (a.reqNum >= b.reqNum) {
        return -1;
    }
    return 1; 
};

const compareLoadMaxH = (a, b) => {
    if (a.load >= b.load) {
        return -1;
    }
    return 1;
}

const compareLoadMinH = (a, b) => {
    if(a.load > b.load) {
        return 1;
    }
    return -1; 
}

// sortedSliceToServer: [{slice, serverIndex}]
let sortedSliceToServer = [
    {
        slice: {start: 0, end: 10},
        serverIndex: 0,
    },
    {
        slice: {start: 11, end: 15},
        serverIndex: 1,
    },
    {
        slice: {start: 16, end: 20},
        serverIndex: 1,
    },
    {
        slice: {start: 21, end: KEYSPACE_MAX},
        serverIndex: 0,
    },

]; // TODO TESTING VALUES
// slicesInfo: {Slice: reqNum}
let slicesInfo = {};
// appServersInfo: [load]
let appServersInfo = []; 
// serverSlices: [max_heap<reqNum, Slice>]
let serverSlices = []; 

let avgReqPerSlice = 0; 
let coldSliceTres = 0; 
let hotSliceThres = 0; 


// Initialize
function initialize() {
 
    for (let i = 0; i < frontEndAxiosClients.length; i++) {
        frontEndAxiosClients[i] = axios.create({
            baseURL: frontEndAddresses[i],
            timeout: AXIOS_CLIENT_TIMEOUT,
            httpAgent: new http.Agent({ 
                keepAlive: true,
                keepAliveMsecs: AXIOS_CLIENT_KEEP_ALIVE_MSECS 
            }),
        });
    }

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

}

async function periodicMonitoringAndLoadBalancing() {
    // Populates slicesInfo
    await getLoadFromAppServers();
    
    console.log("BEFORE ALG SLICES INFO:");
    console.log(slicesInfo);
    console.log("BEFORE ALG SORTEDSLICETOSERVER:");
    console.log(sortedSliceToServer);

    // update global variables 
    updateVars(); 

    calServerLoad(); 
    merge();

    // generate serverSlices and serversInfo with new data after merge
    genServerSlices();

    move(); 
    split();  

    console.log("AFTER ALG SLICES INFO:");
    console.log(slicesInfo);
    console.log("AFTER ALG SORTEDSLICETOSERVER:");
    console.log(sortedSliceToServer);

    sendUpdatedMappings(); 

}

// Populates slicesInfo with new load info
async function getLoadFromAppServers() {
    let newSlicesInfo = {};

    let all_promises = [];

    for (const appServerClient of appServerAxiosClients) { 
        all_promises.push(appServerClient.get('/get-load-info'));
    }

    Promise.all(all_promises)
    .then((allResponses) => {
        // handle success
        for (const [serverIdx, response] of allResponses.entries()) {
            console.log(`Successfully got load from AS at index ${serverIdx}:`);
            console.log(response.data);
            for (const [sliceSerialized, reqCount] of Object.entries(response.data)) {
                // Increment (or initialize to 0 then increment if not exist)
                newSlicesInfo[sliceSerialized] = (newSlicesInfo[sliceSerialized] || 0) + reqCount;
            }
        }

        // Update slicesInfo
        slicesInfo = newSlicesInfo;
        console.log('New slicesInfo is:' + JSON.stringify(slicesInfo));
    })
    .catch((err) => {
        console.log('Error getting load from Some server');
        console.log(err);
    });
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


function genServerSlices(){
    let newServerSlices = [];  
    
    for(let i = 0; i < appServerAddresses.length; i++){
        const maxHeap = new Heap(compareReqMaxH); 
        newServerSlices.push(maxHeap);
    }

    for(let i = 0; i < sortedSliceToServer.length; i++){
        let slice = sortedSliceToServer[i].slice; 
        let serverIndex = sortedSliceToServer[i].serverIndex;
        newServerSlices[serverIndex].push({reqNum: slicesInfo[JSON.stringify(slice)], slice: slice});  
    }

    serverSlices = newServerSlices;
    
}

function calServerLoad() {
    let newServersInfo = [];
     
    for(let i = 0; i < appServerAddresses.length; i++){
        newServersInfo.push(0); 
    }

    for(let i = 0; i < sortedSliceToServer.length; i++){
        let slice = sortedSliceToServer[i].slice; 
        let serverIndex = sortedSliceToServer[i].serverIndex;
        newServersInfo[serverIndex] += slicesInfo[JSON.stringify(slice)];  
    }

    appServersInfo = newServersInfo; 
}

function calAvgReq() {
    let totalReq = 0; 

    for(let k in slicesInfo){
        totalReq += slicesInfo[k]; 
    }
    avgReqPerSlice = Math.ceil(totalReq / sortedSliceToServer.length);
}

function calKeyChurn(slice) {
    return (slice.end > slice.start)? slice.end - slice.start : 0; 
}

function merge() {
    // coldSlices: {index, reqNum}
    let coldSlices = []

    // get all cold slices
    for (let i = 0; i < sortedSliceToServer.length; i++){
        let slice = JSON.parse(JSON.stringify(sortedSliceToServer[i].slice)); 
        if (slicesInfo[JSON.stringify(slice)] < coldSliceTres){

            // get index in sortedSliceToServer to find adjacent slices
            // req_num is for checking if we should do more than one merge
            coldSlices.push({index: i, reqNum: slicesInfo[JSON.stringify(slice)], slice: slice}); 
        }
    }

    let slicesIndexToRemove = new Set(); 

    // merge continuous cold slices
    // TODO: constraining for one merge or allowing multiple slices merge
    for (let i = 0; i < coldSlices.length; i++) {
        if(i > 0 && ((coldSlices[i-1].index+1) == coldSlices[i].index) && coldSlices[i].reqNum < coldSliceTres){
            let firstSlice = JSON.parse(JSON.stringify(coldSlices[i-1].slice)); 
            let secondSlice = JSON.parse(JSON.stringify(coldSlices[i].slice)); 

            // get servers the two slices are at
            let firstServerIndex = sortedSliceToServer[coldSlices[i-1].index].serverIndex; 
            let secondServerIndex = sortedSliceToServer[coldSlices[i].index].serverIndex; 
            
            // merge two slices
            let mergedSlice = {start: firstSlice.start, end: secondSlice.end}; 
            let mergedReq = slicesInfo[JSON.stringify(firstSlice)] + slicesInfo[JSON.stringify(secondSlice)];  

            // add keyChurn if two slices are on different servers
            // and move request load
            if (firstServerIndex != secondServerIndex) {
                // If first server has lower load, change the second slice's serverIndex to first slice's serverIndex
                // and record the movedSlice for calculating keyChurn
                if(appServersInfo[firstServerIndex] < appServersInfo[secondServerIndex]){

                    keyChurn += calKeyChurn(secondSlice); 
                    if(keyChurn > KEY_CHURN_LIMIT){
                        break;
                    }

                    // merged slice move into the first server
                    sortedSliceToServer[coldSlices[i].index].serverIndex = firstServerIndex; 
                    // update server's load
                    appServersInfo[firstServerIndex] += coldSlices[i].reqNum;
                    appServersInfo[secondServerIndex] -= coldSlices[i].reqNum;
                } else {

                    keyChurn += calKeyChurn(firstSlice); 
                    if(keyChurn > KEY_CHURN_LIMIT) {
                        break;
                    }

                    // update server's load
                    appServersInfo[firstServerIndex] -= coldSlices[i-1].reqNum;
                    appServersInfo[secondServerIndex] += coldSlices[i-1].reqNum; 
                }
            }

            // update the second slice range in sortedSliceToServer
            sortedSliceToServer[coldSlices[i].index].slice = mergedSlice; 
            // remove the first slice in sortedSliceToServer array 
            // slicesIndexToRemove.push(coldSlices[i-1].index);
            slicesIndexToRemove.add(coldSlices[i-1].index);

            // update reqNum and slice in coldSlices for next merge
            coldSlices[i].reqNum = mergedReq; 
            coldSlices[i].slice = mergedSlice; 

            // remove the two old slices in slicesInfo and add the new slice
            delete slicesInfo[JSON.stringify(firstSlice)];
            delete slicesInfo[JSON.stringify(secondSlice)];
            slicesInfo[JSON.stringify(mergedSlice)] = mergedReq;
        }
    }

    // remove merged slices from sortedSliceToSever
    let newSortedSliceToServer = []; 
    for(let i = 0; i < sortedSliceToServer.length; i++) {
        if(!slicesIndexToRemove.has(i)){
            newSortedSliceToServer.push(sortedSliceToServer[i]); 
        }
    }

    sortedSliceToServer = newSortedSliceToServer; 
}

function move() {
    let maxHeapServerLoad = new Heap(compareLoadMaxH); 
    let minHeapServerLoad = new Heap(compareLoadMinH); 

    for(let i = 0; i < appServersInfo.length; i++) {
        maxHeapServerLoad.push({load: appServersInfo[i], serverIndex: i}); 
        minHeapServerLoad.push({load: appServersInfo[i], serverIndex: i}); 
    }

    let prevColdest = new Set(); 
    while(!maxHeapServerLoad.isEmpty() && maxHeapServerLoad.peek().load / minHeapServerLoad.peek().load > 1.25 ) {
        // get hottest and coldest server
        let hottestServerIndex = maxHeapServerLoad.peek().serverIndex; 
        let coldestServerIndex = minHeapServerLoad.peek().serverIndex;  

        if(hottestServerIndex == coldestServerIndex){
            break;
        }

        // prevent moving the hottest slice back-and-forth
        if(prevColdest.has(hottestServerIndex)){
            maxHeapServerLoad.pop(); 
            continue; 
        }
        prevColdest.add(coldestServerIndex); 

        // get information of hottest slice
        let hottestSlice = serverSlices[hottestServerIndex].peek().slice;
        let hottestSliceReq = serverSlices[hottestServerIndex].peek().reqNum;

        // calculate key churn
        keyChurn += calKeyChurn(hottestSlice); 

        if (keyChurn >= KEY_CHURN_LIMIT){
            break;
        }
        
        // update heaps 
        
        let hottestLoad = maxHeapServerLoad.peek().load - hottestSliceReq; 
        let coldestLoad = minHeapServerLoad.peek().load + hottestSliceReq; 

        maxHeapServerLoad.pop(); 
        minHeapServerLoad.pop(); 

        maxHeapServerLoad.push({load: hottestLoad, serverIndex: hottestServerIndex}); 
        maxHeapServerLoad.push({load: coldestLoad, serverIndex: coldestServerIndex}); 
        minHeapServerLoad.push({load: coldestLoad, serverIndex: coldestServerIndex}); 
        minHeapServerLoad.push({load: hottestLoad, serverIndex: hottestServerIndex}); 

        // update serverSlices
        // remove target slice from hottest server and add to coldest server
        serverSlices[hottestServerIndex].pop(); 
        serverSlices[coldestServerIndex].push({reqNum: hottestSliceReq, slice: hottestSlice}); 

        // update serversInfo
        appServersInfo[hottestServerIndex] = hottestLoad; 
        appServersInfo[coldestServerIndex] = coldestLoad;  
    }

    // update moved slices' server index in sortedSliceToServer
    let newSortedSliceToServer = []; 
    
    for(let i = 0; i < serverSlices.length; i++) {
        //let clonedSlices = structuredClone(serverSlices[i]); 
        while(!serverSlices[i].isEmpty()){
            newSortedSliceToServer.push({slice: serverSlices[i].peek().slice, serverIndex: i}); 
            serverSlices[i].pop();
        }
        
    }

    newSortedSliceToServer.sort((a, b) => a.slice.start - b.slice.start);
    sortedSliceToServer = newSortedSliceToServer; 

}

function split() {
    let newSlicesInfo = {}; 
    let newSortedSliceToServer = []; 

    for(let i = 0; i < sortedSliceToServer.length; i++){
        let slice = JSON.parse(JSON.stringify(sortedSliceToServer[i].slice)); 
        let serverIndex = sortedSliceToServer[i].serverIndex; 
        let sliceStr = JSON.stringify(slice); 
        let reqNum = slicesInfo[sliceStr]; 

        // check whether the reqNum is higher than threshold
        // and whether the slice can still be split
        if(reqNum > hotSliceThres && slice.end > slice.start) {
            let mid = Math.floor((slice.end - slice.start) / 2) + slice.start; 
            let newSlice = {start: slice.start, end: mid};

            // initilize new slice's request number to half of orifinal request number 
            newSlicesInfo[JSON.stringify(newSlice)] = Math.floor(reqNum / 2); 
            reqNum -= newSlicesInfo[JSON.stringify(newSlice)]; 
            newSortedSliceToServer.push({slice: newSlice, serverIndex: serverIndex}); 
            slice.start = mid + 1; 
        }

        newSlicesInfo[JSON.stringify(slice)] = reqNum; 
        newSortedSliceToServer.push({slice: slice, serverIndex: serverIndex}); 
    }

    slicesInfo = newSlicesInfo;
    sortedSliceToServer = newSortedSliceToServer; 
}

function updateVars() {

    calAvgReq();

    coldSliceTres = avgReqPerSlice * 0.5; 
    hotSliceThres = avgReqPerSlice * 2; 

    keyChurn = 0; 
}


initialize();
setIntervalAsync(periodicMonitoringAndLoadBalancing, LOAD_BALANCING_INTERVAL_MILLISECONDS);