#!/bin/bash


curl -s -X POST -d '{"requestType":"set","key":"1str","value":"value_for_1str"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/kv-request && echo "done1" &
curl -s -X POST -d '{"requestType":"get","key":"1str"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/kv-request && echo "done2" &

wait