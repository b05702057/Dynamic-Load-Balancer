
-- example dynamic request script which demonstrates changing
-- the request path and a header for each request
-------------------------------------------------------------
-- NOTE: each wrk thread has an independent Lua scripting
-- context and thus there will be one counter per thread


-- For initialization, same across all threads
local addrs = {}
local threadIdxCounter = 0

local file_handle = io.open( "users.csv" ) 

local threads = {} -- For each thread to keep track of num requests and responses

-- Called at the beginning to initialize global context for all threads. Avoid duplicating work
-- across threads here
function setup(thread)
    local append = function(host, port)
        for i, addr in ipairs(wrk.lookup(host, port)) do
            if wrk.connect(addr) then
                print('CONNECTED to addr', addr)
                addrs[#addrs+1] = addr
            else 
                print("COULDN'T CONNECT TO addr:", addr)
                os.exit() 
            end
        end
    end

    -- Add these front end addreses to addrs. Only one thread should do it (hence check length is 0).
    if #addrs == 0 then
        append("172.23.144.1", 3000)
        append("172.23.144.1", 3001)
    end
    
    print("all addrs:")
    for i,v in ipairs(addrs) do print(i,v) end  -- print addrs

    -- TODO testing
    thread:set("id", threadIdxCounter)
    table.insert(threads, thread)

    local addrIndex = threadIdxCounter % #addrs + 1  -- since lua data structures are 1-indexed, mod then + 1. mod to wrap around
    threadIdxCounter = threadIdxCounter + 1
    thread.addr = addrs[addrIndex]

    -- thread.addr = addrs[math.random(#addrs)]  -- Get random address in lua addrs table
end

function init(args)
    -- Initialize fields to keep track of num requests and responses
    numRequests = 0
    numResponses = 0

    local msg = "thread addr: %s"
    print(msg:format(wrk.thread.addr))
    -- -- Print members of wrk.thread
    -- for key,value in pairs(wrk.thread) do
    --     print("found member " .. key)
    -- end
end

request = function()
    path = "/long-computation"
    cur_line = file_handle:read("*l") -- read each line per request

    key, value, requestType = cur_line:match("([^,]+),([^,]+),([^,]+)")  -- comma separated
    wrk.method = "POST"
    wrk.body = string.format('{"key": "%s"}', key)
    wrk.headers["Content-Type"] = "application/json"
    wrk.headers["Connection"] = "Keep-Alive"

    -- wrk.addr = addrs[math.random(#addrs)]
    -- for i,v in ipairs(addrs) do print(i,v) end  -- print addrs
    -- wrk.thread.addr = addrs[math.random(#addrs)]

    -- Keep track of numRequests
    numRequests = numRequests + 1


    return wrk.format(nil, path)
end


-- TODO TESTING
function response(status, headers, body)
    numResponses = numResponses + 1
end

function done(summary, latency, requests)
    -- Report results for each thread
    for index, thread in ipairs(threads) do
       local id        = thread:get("id")
       local requests  = thread:get("numRequests")
       local responses = thread:get("numResponses")
       local msg = "thread %d made %d requests and got %d responses"
       print(msg:format(id, requests, responses))
    end
end