#!/bin/bash

# Blue-Green Deployment Script - Deploy Green Instance
# This script deploys the green instance and switches traffic to it

set -e

echo "🚀 Starting Green Deployment..."

# Load environment variables (safely handle special characters)
if [ -f .env.docker ]; then
    set -o allexport
    source .env.docker
    set +o allexport
fi

# Build and start green services
echo "📦 Building and starting green services..."
docker-compose --profile green up -d --build medusa-server-green medusa-worker-green

# Wait for green services to be healthy
echo "⏳ Waiting for green services to be healthy..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:9002/health > /dev/null 2>&1; then
        echo "✅ Green services are healthy!"
        break
    fi

    echo "⏳ Waiting for green services... ($counter/$timeout seconds)"
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Green services failed to become healthy within $timeout seconds"
    exit 1
fi

# Switch nginx traffic to green instance
echo "🔄 Switching traffic to green instance..."
sed -i 's/proxy_pass http:\/\/medusa_blue/proxy_pass http:\/\/medusa_green/g' nginx/nginx.conf
sed -i 's/proxy_pass http:\/\/medusa_blue_health/proxy_pass http:\/\/medusa_green_health/g' nginx/nginx.conf

# Reload Nginx configuration to apply changes
echo "🔄 Reloading Nginx configuration..."
docker-compose exec nginx nginx -s reload

# Stop blue services after successful switch
echo "🛑 Stopping blue services..."
docker-compose stop medusa-server-blue medusa-worker-blue

echo "✅ Green deployment completed successfully!"
echo "🌐 Application is now running on green instance"
echo "📊 Health check: http://localhost/health"
echo "🛍️ Storefront: http://localhost"
echo "⚙️ Admin: http://localhost/app"