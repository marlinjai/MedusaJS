#!/bin/bash
set -e

echo "🚀 Starting FIRST deployment (Blue environment)..."

# SSH into server and run deployment
ssh root@172.104.134.217 << 'REMOTE_EOF'
cd /opt/medusa-app

# Pull latest changes
git pull origin main

# Start infrastructure
echo "🏗️ Starting infrastructure..."
docker-compose up -d postgres redis

# Wait for infrastructure
echo "⏳ Waiting for infrastructure..."
sleep 30

# Deploy blue environment (first deployment)
echo "📦 Deploying Blue environment..."
docker-compose up -d --build medusa-server-blue medusa-worker-blue storefront-blue nginx

# Check status
echo "📊 Checking container status..."
docker-compose ps

echo "✅ First deployment complete!"
echo "🌐 Check: http://172.104.134.217/health"

REMOTE_EOF

