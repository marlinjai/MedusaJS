# 📊 Monitoring Stack for Blue-Green Deployments

This monitoring stack provides **ArgoCD-like visualization** for your Docker-based blue-green deployments.

## 🎯 What You Get

### 🐳 **Portainer** - Your "ArgoCD for Docker"
- **Visual deployment management** similar to ArgoCD's UI
- **Real-time container status** and health monitoring
- **Blue-green deployment visualization**
- **Container logs and resource usage**
- **Stack management and rollback capabilities**

### 📈 **Uptime Kuma** - Service Health Dashboard
- **Beautiful status pages** for your services
- **Real-time uptime monitoring**
- **Alert notifications** (Slack, email, etc.)
- **Response time tracking**

### 📋 **Dozzle** - Live Container Logs
- **Real-time log streaming** from all containers
- **Multi-container log aggregation**
- **Search and filter capabilities**
- **Zero configuration required**

### 🔧 **Nginx Proxy Manager** (Optional)
- **SSL certificate management**
- **Reverse proxy configuration**
- **Access control and authentication**

## 🚀 Quick Setup

```bash
# Make setup script executable
chmod +x monitoring/setup-monitoring.sh

# Deploy monitoring stack
./monitoring/setup-monitoring.sh setup

# Check health
./monitoring/setup-monitoring.sh health
```

## 📱 Access URLs

After deployment, access your monitoring tools:

- **Portainer**: `https://your-domain:9443` (Docker Management)
- **Uptime Kuma**: `http://your-domain:3001` (Service Monitoring)
- **Dozzle**: `http://your-domain:8080` (Container Logs)
- **Nginx Proxy Manager**: `http://your-domain:8081` (Proxy Management)

## 🎨 ArgoCD-like Features in Portainer

Portainer provides similar visualization to ArgoCD:

1. **Application Overview**: See all your containers and their status
2. **Deployment History**: Track container deployments and changes
3. **Health Monitoring**: Real-time health checks and status
4. **Log Aggregation**: Centralized logging for troubleshooting
5. **Rollback Capabilities**: Easy container rollback and management
6. **Resource Monitoring**: CPU, memory, and network usage

## 🔧 Configuration

### Uptime Kuma Monitoring Setup

Add these monitors in Uptime Kuma:

```
1. Storefront Health
   - URL: https://basiscamp-berlin.de
   - Type: HTTP(s)
   - Interval: 60 seconds

2. Admin Panel Health  
   - URL: https://basiscamp-berlin.de/app
   - Type: HTTP(s)
   - Interval: 60 seconds

3. API Health Check
   - URL: https://basiscamp-berlin.de/health
   - Type: HTTP(s)
   - Interval: 30 seconds

4. Blue Deployment Health
   - URL: http://localhost:9000/health
   - Type: HTTP(s)
   - Interval: 60 seconds

5. Green Deployment Health
   - URL: http://localhost:9002/health
   - Type: HTTP(s)
   - Interval: 60 seconds
```

### Portainer Blue-Green Visualization

In Portainer, you can:

1. **View Active Deployment**: See which containers are running (blue/green)
2. **Monitor Health Checks**: Real-time health status of each deployment
3. **Compare Deployments**: Side-by-side comparison of blue vs green
4. **Manage Deployments**: Start, stop, or restart specific deployments
5. **View Logs**: Aggregate logs from blue and green deployments

## 🔥 Firewall Configuration

Open required ports on your VPS:

```bash
sudo ufw allow 9443/tcp  # Portainer HTTPS
sudo ufw allow 9000/tcp  # Portainer HTTP
sudo ufw allow 3001/tcp  # Uptime Kuma
sudo ufw allow 8080/tcp  # Dozzle
sudo ufw allow 8081/tcp  # Nginx Proxy Manager
```

## 📊 Monitoring Your Blue-Green Deployments

### Real-time Deployment Tracking

1. **Pre-Deployment**: Monitor current active deployment
2. **During Deployment**: Watch new containers starting up
3. **Health Checks**: Verify new deployment health before traffic switch
4. **Traffic Switch**: Monitor Nginx configuration changes
5. **Post-Deployment**: Confirm old deployment cleanup

### Alert Configuration

Set up alerts for:
- Container failures
- High resource usage
- Deployment health check failures
- Service downtime
- SSL certificate expiration

## 🛠 Management Commands

```bash
# Deploy monitoring stack
./monitoring/setup-monitoring.sh setup

# Check service health
./monitoring/setup-monitoring.sh health

# Stop monitoring stack
./monitoring/setup-monitoring.sh stop

# Restart monitoring stack
./monitoring/setup-monitoring.sh restart
```

## 🔍 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 9443, 9000, 3001, 8080, 8081 are available
2. **Docker Socket**: Verify `/var/run/docker.sock` is accessible
3. **Firewall**: Check that required ports are open
4. **SSL Certificates**: Use HTTP initially, then configure SSL via Nginx Proxy Manager

### Logs and Debugging

```bash
# View monitoring stack logs
docker compose -f monitoring/docker-compose.monitoring.yml logs -f

# Check specific service
docker logs portainer
docker logs uptime-kuma
docker logs dozzle
```

## 🎯 Integration with Your Blue-Green Deployment

This monitoring stack integrates seamlessly with your existing blue-green deployment:

- **Monitors your existing containers** without interference
- **Provides visual feedback** during deployments
- **Tracks deployment history** and performance
- **Alerts on deployment issues** before they affect users
- **Complements your GitHub Actions** workflow with real-time visibility

The result is an **ArgoCD-like experience** specifically tailored for Docker-based blue-green deployments! 🚀
