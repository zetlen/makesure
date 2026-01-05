# Build stage
FROM node:25-alpine3.22
RUN apk add --no-cache git yq-go jq ast-grep python3

WORKDIR /build

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN npm run build

ENTRYPOINT ["./bin/run.js"]

CMD ["--help"]
