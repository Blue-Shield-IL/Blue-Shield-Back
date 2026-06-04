FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

ENV NODE_ENV production

COPY . .

RUN npm run build

RUN npm prune --production

RUN addgroup -g 1001 -S blueshield
RUN adduser -S blueshield-server -u 1001

USER blueshield-server

EXPOSE 3000

ENTRYPOINT ["node", "dist/main.js"]
