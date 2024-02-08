#!/bin/bash

# Build the image/app

docker build . -t registry.thinx.cloud:5000/pinserver:latest

# Run on port 3333 (non-interactively to enable test)

docker run -t \
-e "SALT=sslpinning.corpus.cz" \
-p 8888:8888 \
registry.thinx.cloud:5000/pinserver:latest

# Test should return list of pinned certificates signed with X-Pin-Challenge

curl -v http://localhost:8888/pin.json