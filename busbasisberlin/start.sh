#!/bin/sh
# Medusa Docker Startup Script
# Handles migrations and starts the Medusa server
# Following official Medusa deployment guide

set -e

echo "🚀 Starting Medusa application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations before starting the server
echo "🔄 Running database migrations..."
npx medusa db:migrate

echo "✅ Migrations completed!"

# Start the Medusa server
echo "🎯 Starting Medusa server..."
exec npm run start
