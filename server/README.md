# Server Deployment

## RESTARTING

* Give Pavel your public SSH key
* ssh pavpan@fpbench.cs.washington.edu
* herbie/infra
* odyssey/server
     * This one has -real.service files for the actual files
* sudo systemctl restart herbie-demo.service
     * or fpbench-server-real.service
     * or fptaylor-server-real.service
* To see status:
    * sudo systemctl status herbie-demo
* To view all logs:
* sudo journalctl -u herbie-demo
* Then hit G to go to the end of the log (most recent) (will take a couple seconds to respond since the file is long)

## Updating server version (herbie)
* always git pull to get new commits
* make sure you are on main/branch you want
* make install
* sudo systemctl restart herbie-demo

## Release checklist for maintainers

### Setting up the server directory
* [ ] Update the Herbie server to the most recent stable commit on `main`
* [ ] Clone the Odyssey repo to the server and make sure `node` and `npm` are installed
* [ ] `cd server` to this directory.
* [ ] Run `./install.sh` to install npm dependencies and put FPTaylor and FPBench binaries in the current directory.

### Setting up the FPTaylor and FPBench servers
* [ ] Copy `fptaylor-server.service` and `fpbench-server.service` to the `/etc/systemd/system/` directory and edit the lines marked \*UPDATE\* to set the correct WorkingDirectory (this directory) and the User you want to run the servers as.
* [ ] Configure the ports in the ExecStart property in the service files if you want to use different ports.
* [ ] Run `systemctl daemon-reload` to recognize the new services.
* [ ] Run `systemctl start fptaylor-server` and `systemctl start fpbench-server` to start the servers. You can check the status with `systemctl status fptaylor-server` and `systemctl status fpbench-server`.
* [ ] Run `systemctl enable fptaylor-server` and `systemctl enable fpbench-server` to start the servers on boot.
<!-- * [ ] Run `./fptaylor-server.sh` to run the FPTaylor server on port 8001. See the script to configure the port. See below for CURL requests to test the server. This could be configured to run as a service with systemd.
* [ ] Run `./fpbench-server.sh` to run the FPBench server on port 8002. See the script to configure the port. See below for CURL requests to test the server. This could be configured to run as a service with systemd. -->
* [ ] On your server, ensure `https://herbie.uwplse.org/fptaylor` points to port 8001 and `https://herbie.uwplse.org/fpbench` points to port 8002 (or whichever ports you have configured).
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
