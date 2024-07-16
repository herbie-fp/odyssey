#!/bin/bash
npm install
node download-and-unzip.js https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fptaylor-dist.zip fptaylor
chmod +x fptaylor/linux/fptaylor-compiled/fptaylor
node download-and-unzip.js https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fpbench-dist.zip fpbench
chmod +x fpbench/linux/fpbench-compiled/bin/fpbench