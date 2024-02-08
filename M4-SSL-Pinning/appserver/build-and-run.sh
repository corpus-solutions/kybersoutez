#!/bin/bash

# Build the image/app

docker build . -t registry.thinx.cloud:5000/ctf24

# Run on port 8889 (interactively to enable Ctrl-C)

docker run -t \
-p 8889:8889 \
registry.thinx.cloud:5000/ctf24

# Test should return a flag when correct client certificate is used (may require full HTTPS so it won't be testable locally)

curl --request POST \
     --url     http://localhost:8889/authorize \
     --cert    ./data/alice_cert.pem \
     --key     ./data/alice_key.pem \
     --header  'Content-Type: application/json' \
     --verbose \
     -d @- \
<< EOF
{
  "hello": "world"
}
EOF