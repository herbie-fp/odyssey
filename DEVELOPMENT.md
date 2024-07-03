## Release checklist
* [ ] Update Herbie server to most recent stable commit on `main`
* [ ] Clone the Odyssey repo to the server and make sure `node` is installed
* [ ] Run `npm install` to install dependencies.
* [ ] In the Odyssey repo, run `node fptaylor-server.js 8001` where 8001 is the desired port (this could be configured to run as a service with systemd)
* [ ] In the Odyssey repo, run `node fpbench-server.js 8002` (this could be configured to run as a service with systemd)
* [ ] Ensure `https://herbie.uwplse.org/fptaylor` points to port 8001 and `https://herbie.uwplse.org/fpbench` points to port 8002
    
## Setting up Odyssey on the FPBench server
* The Odyssey client can be configured to use different servers for any of its tools.

* At the time of writing, the Odyssey demo running on "https://herbie-fp.github.io/odyssey/" points to the Herbie server at 
"https://herbie.uwplse.org/demo" and also now expects an FPTaylor server (which we provide and describe setup for below) 
to be running at "https://herbie.uwplse.org/fptaylor", and an FPBench server (also provided) to be running at "https://herbie.uwplse.org/fpbench".

* Before each release, the Herbie demo server should be updated to match the version Odyssey was developed against (usually just main).

* The FPTaylor server is a simple Node server that uses Express to handle requests. **Its only argument is the port it should run on.** 
Upon request, it runs FPTaylor in a shell. Care was taken to prevent command injection. 
The FPBench server has the same structure as the FPTaylor server.
