#!/bin/bash

# Deploy service to Docker Swarm Stack (leverages Traefik's LetsEncrypt SSL support)

export $(cat .env)
docker stack deploy -c ./swarm.yml ctf24