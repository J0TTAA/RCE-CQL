FROM node:24.18.0-alpine AS dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci

FROM dependencies AS build
COPY apps/api apps/api
RUN npm run build --workspace @rce-cql/api

FROM node:24.18.0-alpine AS production-dependencies
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
RUN npm ci --omit=dev

FROM node:24.18.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
