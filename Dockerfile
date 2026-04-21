# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Runtime stage
FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist/trustgate-public/browser ./public
COPY server.mjs ./
COPY src/assets ./public/assets
ENV PORT=80
ENV BACKEND_INTERNAL_URL=http://127.0.0.1:8080
ENV DEMO_CLIENT_KEY=
EXPOSE 80
CMD ["node", "server.mjs"]
