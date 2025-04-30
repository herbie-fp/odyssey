#!/bin/bash
cd GPU-FPX
cd example
#get integration files
git clone https://github.com/nicolasbaret/GPU-FPX-Odyssey.git
shopt -s dotglob nullglob
mv GPU-FPX-Odyssey/* .
rmdir GPU-FPX-Odyssey
