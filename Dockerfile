# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors and locks
COPY package*.json ./

# Install all build dependencies
RUN npm ci

# Copy full application source
COPY . .

# Build the application (runs vite build & esbuild bundle)
RUN npm run build

# Stage 2: Runner image
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

COPY package*.json ./

# Install production dependencies only to keep container lightweight
RUN npm ci --only=production

# Copy built artifacts from builder stage
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 3000

ENV NODE_ENV=production

# Start Express full-stack bundle
CMD ["npm", "run", "start"]
