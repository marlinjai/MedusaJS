# Minimal Monitoring Stack

## Services
- **Portainer**: Docker management at `portainer.basiscamp-berlin.de`
- **Uptime Kuma**: Service monitoring at `status.basiscamp-berlin.de`

## Setup
1. Add DNS A records for subdomains
2. Deploy: `docker compose -f monitoring/docker-compose.yml up -d`
3. Configure nginx to include monitoring config

## Access
- **Portainer**: https://portainer.basiscamp-berlin.de
- **Uptime Kuma**: https://status.basiscamp-berlin.de
