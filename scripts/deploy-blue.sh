#!/bin/bash

# Blue-Green Deployment Script - Deploy Blue Instance
# This script deploys the blue instance and switches traffic to it

set -e

echo "🚀 Starting Blue Deployment..."

# Load environment variables (safely handle special characters)
if [ -f .env.docker ]; then
    set -o allexport
    source .env.docker
    set +o allexport
fi

# Build and start blue services
echo "📦 Building and starting blue services..."
docker-compose up -d --build medusa-server-blue medusa-worker-blue

# Wait for blue services to be healthy
echo "⏳ Waiting for blue services to be healthy..."
timeout=300
counter=0

while [ $counter -lt $timeout ]; do
    if curl -f http://localhost:9000/health > /dev/null 2>&1; then
        echo "✅ Blue services are healthy!"
        break
    fi

    echo "⏳ Waiting for blue services... ($counter/$timeout seconds)"
    sleep 5
    counter=$((counter + 5))
done

if [ $counter -ge $timeout ]; then
    echo "❌ Blue services failed to become healthy within $timeout seconds"
    exit 1
fi

# Switch nginx traffic to blue instance
echo "🔄 Switching traffic to blue instance..."
sed -i 's/proxy_pass http:\/\/medusa_green/proxy_pass http:\/\/medusa_blue/g' nginx/nginx.conf
sed -i 's/proxy_pass http:\/\/medusa_green_health/proxy_pass http:\/\/medusa_blue_health/g' nginx/nginx.conf

# Reload Nginx configuration to apply changes
echo "🔄 Reloading Nginx configuration..."
docker-compose exec nginx nginx -s reload

# Stop green services after successful switch
echo "🛑 Stopping green services..."
docker-compose stop medusa-server-green medusa-worker-green

echo "✅ Blue deployment completed successfully!"
echo "🌐 Application is now running on blue instance"
echo "📊 Health check: http://localhost/health"
echo "🛍️ Storefront: http://localhost"
echo "⚙️ Admin: http://localhost/app"