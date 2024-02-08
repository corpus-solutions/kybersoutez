#!/bin/bash

# Build the image/app

docker build . -t registry.thinx.cloud:5000/pinserver

# Run on port 3333 (interactively to enable Ctrl-C)

docker run -t \
-e "SALT=sslpinning.corpus.cz" \
-p 8888:8888 \
registry.thinx.cloud:5000/pinserver

# Test should return list of pinned certificates signed with X-Pin-Challenge

curl http://localhost:8888/pin.json