FROM node:21-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app and dependencies
COPY ./app ./

# If you are building your code for production
RUN npm ci --only=production

EXPOSE 8889
USER node
CMD [ "node", "index.js" ]
