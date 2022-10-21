#!/bin/bash

# Build the image/app

docker build . -t suculent/nodetest

# Run on port 3333 (interactively to enable Ctrl-C)

docker run -ti -p 3333:3333 suculent/nodetest

# Test should return "Hello World!"

curl http://localhost:3333