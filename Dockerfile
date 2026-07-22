FROM node:20-bullseye-slim AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update -y && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

EXPOSE 4000
CMD ["sh", "-c", "npm run db:deploy && node server/dist/index.js"]
