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
RUN nx build backend-api --prod

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /app/package*.json ./
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/backend-api ./
EXPOSE 3000
CMD ["node", "main.js"]
