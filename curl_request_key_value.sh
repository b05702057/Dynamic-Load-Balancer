#!/bin/bash


# curl -s -X POST -d '{"requestType":"set","key":"some_key","value":"some_value"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/kv-request && echo "done1" &
curl -s -X POST -d '{"requestType":"get","key":"1"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/kv-request && echo "done2" &

wait