#!/bin/bash

# Build the image/app

docker build . -t registry.thinx.cloud:5000/pinserver

docker push registry.thinx.cloud:5000/pinserver