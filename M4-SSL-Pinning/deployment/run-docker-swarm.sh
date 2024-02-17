#!/bin/bash

# Deploy service to Docker Swarm Stack (leverages Traefik's LetsEncrypt SSL support)

export $(cat .env)

docker login
docker pull registry.thinx.cloud:5000/pinserver:latest
docker pull registry.thinx.cloud:5000/ctf24:latest

docker stack deploy --with-registry-auth -c ./swarm.yml ssl-pinning