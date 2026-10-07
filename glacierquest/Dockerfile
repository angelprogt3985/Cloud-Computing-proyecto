FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY api/package*.json ./api/
RUN cd api && npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY api/src ./api/src
COPY client ./client
COPY assets ./assets
USER node
EXPOSE 8080
CMD ["node", "api/src/server.js"]
