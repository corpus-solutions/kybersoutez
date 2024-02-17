# README (TODO)



# android

Android client application sources (secret).

# ios

iOS client application sources (secret).

# task

Task details incl. mobile application binaries (public).

# deployment

## Sample server deployment

- run-docker-swarm.sh: execution script (requires Docker Swarm and Traefik)
- pin.json: for adding dynamic certificate pins manually (by hash)
- data: for adding dynamic certificates automatically

## appserver

Application service code (secret) running at `ssl.thinx.cloud`, implements HTTPS API with JWT provider (for validated and properly authenticated clients only).

## pinserver

SSL Pinning service running at `ctf24.teacloud.net` that provides dynamic information about valid certificates to client applications.
