FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g nx@latest

FROM base AS dependencies
COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./
RUN npm ci

FROM dependencies AS build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN nx build frontend-react --prod

FROM nginx:alpine AS runtime
COPY --from=build /app/dist/apps/frontend-react /usr/share/nginx/html
COPY apps/frontend-react/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
