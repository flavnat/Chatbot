# Backend Dockerfile - Node.js  
FROM node:20-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p logs

RUN chmod +x startup.sh

EXPOSE 3000

# Default command - runs setup, training, then server
CMD ["./startup.sh"]