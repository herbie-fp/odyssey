## File explanation for integration with Odyssey
#### analyzer_result_parser.py, detector_result_parser.py
For help with further development of this tool or usage, e-mail Nicolas Baret at u1340304@umail.utah.edu OR message him ->  https://www.linkedin.com/in/nicolas-baret-031653111/

#### To set everything up
in this directory level (~odyssey/server):
Run in this order:

1. download-gpu-fpx.sh
2. make-gpu-fpx.sh
3. run-gpu-fpx-integration-setup.sh
4. Navigate to ~odyssey/server/GPU-FPX/example, and run : chmod +x compile-odyssey.sh

#### To use the tool:
1. you need to have a GPU on the machine you are running these commands on and serving odyssey from for this tool to work, if you do then continue:
2. navigate to ~/odyssey/server/ (if you are not already in it)
3. run these two commands in a terminal to start a server for each tool:
    - node tool-server.js --port 8001 --tool gpufpxAnalyzer --path ~/odyssey/server/GPU-FPX/example --host 0.0.0.0
    - node tool-server.js --port 8003 --tool gpufpxDetector --path ~/odyssey/server/GPU-FPX/example
4. start odyssey by serving it on your local machine, and use the tool in the UI, adding console logs to see what results are coming in from GPU-FPX is heplful for debugging

These take the output from the detector and analyzer, parses it and gives a summary, user should not need to touch this

#### driver-program.cu
This is the cuda program which dynamically takes in the expression and is run on GPU-FPX

#### compile-odyssey.sh
This is the shell script which takes care of compiling the driver-program with a new expression



- Big things to fix: 
    - Right now the tool only runs on expressions, not full functions, so anything which has an if-statement in it does not run correctly
    - None of the results of GPU-FPX has been verified for expressions, this is to mean there are no tests which verify that the detector output, 
    and analyzer output are reporting the correct things a GPU should be reporting for those expressions, a full test-suite verifying all expressions should be made (not-trivial, and very important)
    - Expressions lose their state once un-selected and the integration needs to be run again


## These are instructions of just how to use GPU-FPX via cmdline on the example.cu files in this folder, see the makefile for commands to append to make, these are not accurate 
#### Compile it
```bash
make
```
#### Run it
```bash
make run
```
#### Use detector
```bash
make detect
```
#### Use analzyer 
```bash
make analyze
```
