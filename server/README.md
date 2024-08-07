# Server Deployment
## Release checklist for maintainers
* [ ] Update the Herbie server to the most recent stable commit on `main`
* [ ] Clone the Odyssey repo to the server and make sure `node` and `npm` are installed
* [ ] `cd server` to this directory.
* [ ] Run `./install.sh` to install npm dependencies and put FPTaylor and FPBench binaries in the current directory.
* [ ] Run `./fptaylor-server.sh` to run the FPTaylor server on port 8001. See the script to configure the port. See below for CURL requests to test the server. This could be configured to run as a service with systemd.
* [ ] Run `./fpbench-server.sh` to run the FPBench server on port 8002. See the script to configure the port. See below for CURL requests to test the server. This could be configured to run as a service with systemd.
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

* The other tool servers are simple Node servers that use Express to handle requests and execute command line tools in a shell. Care was taken to prevent command injection.
