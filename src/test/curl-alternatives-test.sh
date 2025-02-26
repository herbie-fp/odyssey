#!/bin/bash

URL="http://localhost:8000/api/alternatives"
BODY='{ "formula": "(FPCore (x) :spec (sqrt (* x x)) (sqrt (* x x)))", "sample": [ [ [-3.433673523436811e+284], 3.433673523436811e+284 ], [ [-5.949208088016812e+185], 5.949208088016812e+185 ], [ [4.808590949423921e-41], 4.808590949423921e-41 ], [ [-1.9989002899750099e-50], 1.9989002899750099e-50 ] ] }'

curl -X POST "$URL" \
     -H "Content-Type: application/json" \
     -d "$BODY" | jq .