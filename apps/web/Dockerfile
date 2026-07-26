FROM node:24.18.0-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace @rce-cql/web --include-workspace-root

COPY apps/web apps/web
RUN npm run build --workspace @rce-cql/web

FROM node:24.18.0-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY apps/web/server.mjs apps/web/server.mjs
COPY --from=build /app/apps/web/dist apps/web/dist
EXPOSE 5173
CMD ["node", "apps/web/server.mjs"]
