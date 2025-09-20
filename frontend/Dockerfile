# Frontend Dockerfile - Simple Development Setup
FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

# Expose port
EXPOSE 5173

# Start development server
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]
