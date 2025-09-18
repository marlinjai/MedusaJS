#!/bin/bash

# Blue-Green Deployment Script - Deploy Blue Instance
# This script deploys the blue instance and switches traffic to it

set -e

echo "🚀 Starting Blue Deployment..."

# Load environment variables
if [ -f .env.docker ]; then
    export $(cat .env.docker | grep -v '^#' | xargs)
fi

# Build and start blue services
echo "📦 Building and starting blue services..."
docker-compose up -d --build medusa-server-blue medusa-worker-blue storefront-blue

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

# Update Nginx configuration to route traffic to blue
echo "🔄 Updating Nginx configuration to route traffic to blue..."
cat > nginx/nginx.conf << 'EOF'
# Nginx configuration for Medusa Blue-Green Deployment
# This configuration supports automatic failover between blue and green instances

events {
    worker_connections 1024;
}

http {
    # Upstream for Medusa API (Blue instance)
    upstream medusa_blue {
        server medusa-server-blue:9000 max_fails=3 fail_timeout=30s;
    }

    # Upstream for Medusa API (Green instance)
    upstream medusa_green {
        server medusa-server-green:9002 max_fails=3 fail_timeout=30s;
    }

    # Upstream for Storefront (Blue instance)
    upstream storefront_blue {
        server storefront-blue:8000 max_fails=3 fail_timeout=30s;
    }

    # Upstream for Storefront (Green instance)
    upstream storefront_green {
        server storefront-green:8000 max_fails=3 fail_timeout=30s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=storefront:10m rate=20r/s;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Main server block
    server {
        listen 80;
        server_name localhost;

        # Storefront routes (Blue instance active)
        location / {
            limit_req zone=storefront burst=20 nodelay;

            proxy_pass http://storefront_blue;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
                proxy_pass http://storefront_blue;
            }
        }

        # Medusa API routes (Blue instance active)
        location /api/ {
            limit_req zone=api burst=10 nodelay;

            proxy_pass http://medusa_blue;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # Health check endpoint
            location = /api/health {
                proxy_pass http://medusa_blue/health;
                access_log off;
            }
        }

        # Medusa Admin routes (Blue instance active)
        location /app/ {
            limit_req zone=api burst=10 nodelay;

            proxy_pass http://medusa_blue;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check endpoint
        location = /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # Blue-Green deployment control endpoints
        location = /deploy/blue {
            access_log off;
            return 200 "blue\n";
            add_header Content-Type text/plain;
        }

        location = /deploy/green {
            access_log off;
            return 200 "green\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

# Reload Nginx configuration
echo "🔄 Reloading Nginx configuration..."
docker-compose exec nginx nginx -s reload

echo "✅ Blue deployment completed successfully!"
echo "🌐 Application is now running on blue instance"
echo "📊 Health check: http://localhost/health"
echo "🛍️ Storefront: http://localhost"
echo "⚙️ Admin: http://localhost/app"