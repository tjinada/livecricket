# Stage 1: Build Angular frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build --prod

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

# Copy backend
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/src ./src

# Copy frontend build to public folder
COPY --from=frontend-build /app/frontend/dist/livecricket ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/api/health || exit 1

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Start application
CMD ["node", "src/app.js"]
