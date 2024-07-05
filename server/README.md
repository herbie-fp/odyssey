## Release checklist
* [ ] Update Herbie server to most recent stable commit on `main`
* [ ] Clone the Odyssey repo to the server and make sure `node` and `npm` are installed
* [ ] `cd server` to this directory, then run `npm install` to install dependencies.
* [ ] Run `node download-and-unzip.js https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fptaylor-dist.zip fptaylor` to download and unzip the FPTaylor distribution
* [ ] Run `chmod +x fptaylor/linux/fptaylor-compiled/fptaylor` to make the FPTaylor binary executable
* [ ] Run `node download-and-unzip.js https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fpbench-dist.zip fpbench` to download and unzip the FPBench distribution
* [ ] Run `chmod +x fpbench/linux/fpbench-compiled/bin/fpbench` to make the FPBench binary executable (NOTE this path is a little different from the FPTaylor path!)
* [ ] Run `node fptaylor-server.js 8001 fptaylor/linux/fptaylor-compiled/fptaylor` where 8001 is the desired port (this could be configured to run as a service with systemd). See below for CURL requests to test the server.
* [ ] Run `node fpbench-server.js 8002 fpbench/linux/fpbench-compiled/bin/fpbench` (this could be configured to run as a service with systemd). See below for CURL requests to test the server.
* [ ] On your server, ensure `https://herbie.uwplse.org/fptaylor` points to port 8001 and `https://herbie.uwplse.org/fpbench` points to port 8002
* [ ] You can confirm the servers are operating correctly by running CURL requests like the following:
```
curl -X POST http://localhost:8001/exec \
     -H "Content-Type: application/json" \
     -d '{
           "fptaylorInput": "{\nVariables\n\tfloat64 x in [0, 10];\n\nExpressions\n\tex0 = rnd64(rnd64(1) / rnd64(rnd64(sqrt(rnd64(rnd64(1) + x))) + rnd64(sqrt(x))));\n}\n"
         }'

curl -X POST http://localhost:8002/exec \
     -H "Content-Type: application/json" \
     -d '{"formulas":["(FPCore (x) :pre (<= 0 x 10) (/ 1 (+ (sqrt (+ 1 x)) (sqrt x))))"]}'
```    
## Setting up Odyssey on the FPBench server
* The Odyssey client can be configured to use different servers for any of its tools.

* At the time of writing, the Odyssey demo running on "https://herbie-fp.github.io/odyssey/" points to the Herbie server at 
"https://herbie.uwplse.org/demo" and also now expects an FPTaylor server (which we provide and describe setup for below) 
to be running at "https://herbie.uwplse.org/fptaylor", and an FPBench server (also provided) to be running at "https://herbie.uwplse.org/fpbench".

* Before each release, the Herbie demo server should be updated to match the version Odyssey was developed against (usually just main).

* The FPTaylor server is a simple Node server that uses Express to handle requests. **Its only argument is the port it should run on.** 
Upon request, it executes FPTaylor in a shell. Care was taken to prevent command injection. 
The FPBench server has the same structure as the FPTaylor server.
