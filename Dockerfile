FROM node:24.14.0-alpine AS build

WORKDIR /app

RUN npm install -g npm@11.14.1

COPY package.json ./
RUN npm install --no-package-lock --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/study-org/browser /usr/share/nginx/html

EXPOSE 3070
