FROM node:24-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@10.18.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
RUN pnpm install --filter @financy/backend --frozen-lockfile
COPY backend backend
RUN pnpm --filter @financy/backend build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/prisma.config.ts ./backend/prisma.config.ts
COPY --from=build /app/backend/package.json ./backend/package.json
RUN mkdir -p /app/backend/storage/avatars && chown -R node:node /app/backend/storage
USER node
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/app/server.js"]
