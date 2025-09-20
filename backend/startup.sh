#!/bin/bash

# Wait for Qdrant to be ready
echo "Waiting for Qdrant to be ready..."
until curl -f http://qdrant:6333/; do
  echo "Qdrant is unavailable - sleeping"
  sleep 2
done

echo "Qdrant is ready!"

# Setup Qdrant
echo "Setting up Qdrant..."
npm run setup:js:qdrant

# Run training
echo "Running training..."
npm run train:js:chatbot

# Start the server
echo "Starting server..."
npm start