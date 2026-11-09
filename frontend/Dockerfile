FROM node:24-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@10.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --filter @financy/frontend --frozen-lockfile
COPY frontend frontend
ARG VITE_BACKEND_URL=/graphql
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
RUN pnpm --filter @financy/frontend build

FROM nginx:1.28-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
