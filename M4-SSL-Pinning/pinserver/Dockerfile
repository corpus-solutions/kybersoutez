FROM node:21-alpine

ARG SALT
ENV SALT=${SALT}

# Create app directory
WORKDIR /usr/src/app

# Install app and dependencies
COPY ./app ./

# If you are building your code for production
RUN npm ci --omit=dev

EXPOSE 8888
USER node
CMD [ "node", "index.js" ]
