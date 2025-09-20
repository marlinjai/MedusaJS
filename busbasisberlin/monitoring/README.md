# Monitoring Stack

This directory contains the monitoring stack for the MedusaJS application with SSL-secured subdomains.

## Services

- **Portainer**: Docker container management UI

  - URL: https://portainer.basiscamp-berlin.de
  - Purpose: Manage Docker containers, images, networks, and volumes

- **Uptime Kuma**: Service monitoring and status page
  - URL: https://status.basiscamp-berlin.de
  - Purpose: Monitor application uptime and create status dashboards

## SSL Configuration

The monitoring services use the wildcard SSL certificate (`*.basiscamp-berlin.de`) that was obtained via Let's Encrypt DNS challenge.

## Deployment

The monitoring stack is automatically deployed as part of the main GitHub Actions workflow. It:

1. Deploys the monitoring containers
2. Configures nginx with subdomain routing
3. Uses the existing wildcard SSL certificate
4. Connects to the main application network

## Manual Deployment

If you need to deploy monitoring manually:

```bash
cd monitoring
docker compose up -d
```

Then configure nginx:

```bash
docker cp nginx-monitoring.conf medusa_nginx:/etc/nginx/conf.d/monitoring.conf
docker exec medusa_nginx nginx -t
docker exec medusa_nginx nginx -s reload
```

## Network Configuration

The monitoring services connect to the `busbasisberlin_medusa_network` to communicate with the main nginx proxy.

## Access

- Main App: https://basiscamp-berlin.de
- Admin Panel: https://basiscamp-berlin.de/app
- Portainer: https://portainer.basiscamp-berlin.de
- Status Page: https://status.basiscamp-berlin.de
