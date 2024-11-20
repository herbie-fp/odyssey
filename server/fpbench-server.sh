#!/bin/bash

#normal startup
# node tool-server.js --port 8002 --tool fpbench --path fpbench/linux/fpbench-compiled/bin/fpbench


#for local testing - still getting a 500 error with this
node tool-server.js --port 8002 --tool fpbench --path fpbench/linux/fpbench-compiled/bin/fpbench "$@"