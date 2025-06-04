# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Force compatible dependency resolution
RUN npm install --legacy-peer-deps --force
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server.js"]


