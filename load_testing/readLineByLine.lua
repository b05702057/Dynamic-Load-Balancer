
-- example dynamic request script which demonstrates changing
-- the request path and a header for each request
-------------------------------------------------------------
-- NOTE: each wrk thread has an independent Lua scripting
-- context and thus there will be one counter per thread


-- For initialization, same across all threads
local addrs = {}
local threadIdxCounter = 0

local file_handle = io.open( "users.csv" ) 

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
    
    for i,v in ipairs(addrs) do print(i,v) end  -- print addrs

    local addrIndex = threadIdxCounter % #addrs + 1  -- since lua data structures are 1-indexed, mod then + 1. mod to wrap around
    threadIdxCounter = threadIdxCounter + 1
    thread.addr = addrs[addrIndex]

    -- thread.addr = addrs[math.random(#addrs)]  -- Get random address in lua addrs table
end

function init(args)
    local msg = "thread addr: %s"
    print(msg:format(wrk.thread.addr))
    -- -- Print members of wrk.thread
    -- for key,value in pairs(wrk.thread) do
    --     print("found member " .. key)
    -- end
end

request = function()
    path = "/kv-request"
    cur_line = file_handle:read("*l") -- read each line per request

    key, value, requestType = cur_line:match("([^,]+),([^,]+),([^,]+)")  -- comma separated
    wrk.method = "POST"
    wrk.body = string.format('{"requestType": "%s", "key": "%s", "value": "%s"}', requestType, key, value)
    wrk.headers["Content-Type"] = "application/json"
    wrk.headers["Connection"] = "Keep-Alive"

    -- wrk.addr = addrs[math.random(#addrs)]
    -- wrk.thread.addr = addrs[math.random(#addrs)]


    return wrk.format(nil, path)
end
