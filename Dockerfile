FROM node:12.13.0-alpine

WORKDIR /app
COPY package.json /app
RUN npm install
COPY . /app
RUN npm install pm2 -g
CMD ["pm2-runtime", "index.js"]