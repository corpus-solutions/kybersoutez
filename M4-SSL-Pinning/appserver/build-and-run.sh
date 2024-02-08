#!/bin/bash

# Build the image/app

docker build . -t registry.thinx.cloud:5000/ctf24

# Run on port 3333 (interactively to enable Ctrl-C)

docker run -t \
-p 8889:8889 \
registry.thinx.cloud:5000/ctf24

# Test should return a flag when correct client certificate is used

curl https://localhost:8889/authorize