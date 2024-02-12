FROM node:21-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app and dependencies
COPY ./app ./

# If you are building your code for production
# RUN npm ci --only=production
RUN npm install .

# HTTP endpoint exposed as HTTPS using Traefik
EXPOSE 8889

# Local HTTPS endpoint using Traefik's certificate (exported)
EXPOSE 8890

USER node
CMD [ "node", "index.js" ]
