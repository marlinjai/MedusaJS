#!/bin/sh

# Medusa Production Startup Script
# Based on official Medusa Docker recommendations
# Runs from .medusa/server directory as per official docs

echo "Starting Medusa production server from .medusa/server directory..."

# Use NODE_ENV from environment (defaults to production if not set)
export NODE_ENV=${NODE_ENV:-production}

# Run migrations (from built directory)
echo "Running database migrations..."
npx medusa db:migrate || {
    echo "Migration failed, but continuing..."
}

# Start the production server (using npm run start as per official docs)
echo "Starting Medusa server..."
npm run start