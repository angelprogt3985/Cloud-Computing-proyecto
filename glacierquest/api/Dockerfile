# Small, production-only image. Cloud Run injects PORT at runtime
# (defaults to 8080), which src/config/env.js already reads.

FROM node:20-slim

WORKDIR /app

# Copy manifest first so `npm ci` is cached unless dependencies change.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/index.js"]