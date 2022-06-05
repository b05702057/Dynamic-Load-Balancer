#!/bin/bash


curl -s -X POST -d '{"key":"10"}' -H 'Content-Type: application/json' http://127.0.0.1:3000/long-computation && echo "done1" &
wait