FROM node:24.14.0-alpine AS build

WORKDIR /app

RUN npm install -g npm@11.14.1

COPY package.json ./
RUN npm install --no-package-lock --no-audit --no-fund

COPY . .
RUN npm run build

FROM node:24.14.0-alpine

WORKDIR /app

COPY server.mjs ./
COPY --from=build /app/dist/study-org/browser ./public

ENV API_URL=/api
ENV BACKEND_URL=http://95.111.238.203:3071
ENV PORT=3070

EXPOSE 3070

CMD ["node", "server.mjs"]
