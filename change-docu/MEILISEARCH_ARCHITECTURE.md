# Meilisearch Architecture & Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐              ┌──────────────────┐            │
│  │   Storefront     │              │   Admin Panel    │            │
│  │   (Vercel)       │              │   (Browser)      │            │
│  └────────┬─────────┘              └────────┬─────────┘            │
│           │                                  │                       │
│           │ HTTPS                            │ HTTPS                 │
│           │                                  │                       │
└───────────┼──────────────────────────────────┼───────────────────────┘
            │                                  │
            │                                  │
            ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         VPS SERVER (Ubuntu)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │                    Nginx (SSL Termination)                    │ │
│   │                   Port 443 (HTTPS) / 80 (HTTP)                │ │
│   └──────────────┬─────────────────────────┬─────────────────────┘ │
│                  │                          │                        │
│                  │ Reverse Proxy            │ Reverse Proxy          │
│                  │                          │                        │
│   ┌──────────────▼──────────────┐   ┌──────▼─────────────────────┐ │
│   │   Blue Deployment (Active)  │   │  Green Deployment (Standby)│ │
│   ├─────────────────────────────┤   ├────────────────────────────┤ │
│   │                             │   │                            │ │
│   │ Medusa Server (9000)        │   │ Medusa Server (9002)       │ │
│   │ Medusa Worker (9001)        │   │ Medusa Worker (9003)       │ │
│   │                             │   │                            │ │
│   └──┬────────────────────────┬─┘   └──┬─────────────────────┬──┘ │
│      │                        │        │                     │     │
│      │ Internal Docker Network (busbasisberlin_medusa_network)│     │
│      │                        │        │                     │     │
│   ┌──▼────────────────────────▼────────▼─────────────────────▼──┐ │
│   │                  Persistent Services                         │ │
│   ├──────────────────────────────────────────────────────────────┤ │
│   │                                                              │ │
│   │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │ │
│   │  │ PostgreSQL  │  │   Redis     │  │   Meilisearch    │   │ │
│   │  │  (Port      │  │  (Port      │  │   (Port 7700)    │   │ │
│   │  │   5432)     │  │   6379)     │  │                  │   │ │
│   │  └─────────────┘  └─────────────┘  └──────────────────┘   │ │
│   │                                                              │ │
│   │  All services persist during blue-green deployments         │ │
│   │                                                              │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Product Search Flow (Storefront)

```
┌──────────────┐
│  Storefront  │
│   (User)     │
└──────┬───────┘
       │ 1. Search request
       │ GET /store/products?q=search_term
       ▼
┌──────────────────┐
│  Nginx (VPS)     │
│  SSL Termination │
└──────┬───────────┘
       │ 2. Forward to Medusa
       ▼
┌─────────────────────┐
│  Medusa Server      │
│  (Blue or Green)    │
│  Port 9000/9002     │
└──────┬──────────────┘
       │ 3. Internal Docker network
       │    http://medusa_meilisearch:7700/indexes/products/search
       │    Authorization: Bearer [MEILISEARCH_API_KEY]
       ▼
┌─────────────────────┐
│   Meilisearch       │
│   Container         │
│   Port 7700         │
└──────┬──────────────┘
       │ 4. Search results (JSON)
       ▼
┌─────────────────────┐
│  Medusa Server      │
│  Formats results    │
└──────┬──────────────┘
       │ 5. Returns products
       ▼
┌──────────────┐
│  Storefront  │
│  Displays    │
└──────────────┘
```

### 2. Product Sync Flow (Real-time Update)

```
┌─────────────────┐
│  Admin Panel    │
│  Creates/Updates│
│  Product        │
└────────┬────────┘
         │ 1. API request
         │ POST /admin/products
         ▼
┌────────────────────┐
│  Medusa Server     │
│  Saves to DB       │
└────────┬───────────┘
         │ 2. Emits event
         │ "product.created"
         ▼
┌────────────────────┐
│  Redis Event Bus   │
└────────┬───────────┘
         │ 3. Event consumed
         ▼
┌────────────────────┐
│  Medusa Worker     │
│  (Subscriber)      │
└────────┬───────────┘
         │ 4. Triggers workflow
         │ syncProductsWorkflow
         ▼
┌────────────────────┐
│  Sync Workflow     │
│  Transforms data   │
└────────┬───────────┘
         │ 5. Index product
         │ POST http://medusa_meilisearch:7700/indexes/products/documents
         │ Authorization: Bearer [MEILISEARCH_API_KEY]
         ▼
┌────────────────────┐
│   Meilisearch      │
│   Updates index    │
└────────────────────┘
         │
         │ Now searchable!
         ▼
```

### 3. Deployment Flow (Environment Variables)

```
┌──────────────────────────────┐
│  GitHub Repository Secrets   │
│                              │
│  - MEILISEARCH_HOST          │
│  - MEILISEARCH_API_KEY       │
│  - MEILISEARCH_MASTER_KEY    │
│  - MEILISEARCH_PRODUCT_INDEX │
└──────────────┬───────────────┘
               │ Referenced in workflow
               ▼
┌──────────────────────────────┐
│  .github/workflows/deploy.yml│
│                              │
│  env:                        │
│    MEILISEARCH_HOST: ${{...}}│
└──────────────┬───────────────┘
               │ SSH with envs parameter
               ▼
┌──────────────────────────────┐
│  VPS Server Shell            │
│                              │
│  export MEILISEARCH_HOST=... │
│  export MEILISEARCH_API_KEY=.│
└──────────────┬───────────────┘
               │ Execute deployment script
               ▼
┌──────────────────────────────┐
│  deploy-with-domain.sh       │
│                              │
│  env MEILISEARCH_HOST="$..." │
└──────────────┬───────────────┘
               │ Pass to main deploy
               ▼
┌──────────────────────────────┐
│  deploy.sh                   │
│                              │
│  export MEILISEARCH_HOST ... │
└──────────────┬───────────────┘
               │ Docker Compose reads env
               ▼
┌──────────────────────────────┐
│  docker-compose.base.yml     │
│  docker-compose.blue.yml     │
│                              │
│  environment:                │
│    - MEILISEARCH_HOST=${...} │
└──────────────┬───────────────┘
               │ Container env vars
               ▼
┌──────────────────────────────┐
│  Running Containers          │
│                              │
│  - medusa_meilisearch        │
│  - medusa_backend_server     │
│  - medusa_backend_worker     │
└──────────────┬───────────────┘
               │ Process environment
               ▼
┌──────────────────────────────┐
│  Application Code            │
│                              │
│  medusa-config.ts            │
│  meilisearch service         │
└──────────────────────────────┘
```

## Container Communication Matrix

| From Container | To Container          | Protocol | Address                            | Purpose           |
| -------------- | --------------------- | -------- | ---------------------------------- | ----------------- |
| Medusa Server  | Meilisearch           | HTTP     | `http://medusa_meilisearch:7700`   | Search & index    |
| Medusa Worker  | Meilisearch           | HTTP     | `http://medusa_meilisearch:7700`   | Background sync   |
| Medusa Server  | PostgreSQL            | TCP      | `postgres:5432`                    | Database queries  |
| Medusa Worker  | PostgreSQL            | TCP      | `postgres:5432`                    | Database queries  |
| Medusa Server  | Redis                 | TCP      | `redis:6379`                       | Event bus & cache |
| Medusa Worker  | Redis                 | TCP      | `redis:6379`                       | Event bus & jobs  |
| Nginx          | Medusa Server (Blue)  | HTTP     | `medusa_backend_server_blue:9000`  | Reverse proxy     |
| Nginx          | Medusa Server (Green) | HTTP     | `medusa_backend_server_green:9002` | Reverse proxy     |
| External       | Nginx                 | HTTPS    | `your-domain.com:443`              | Public access     |

## Security Boundaries

```
┌────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                          │
│                                                             │
│  Anyone can access                                          │
│  - Storefront (Vercel)                                      │
│  - Your domain via HTTPS (through Nginx)                    │
└─────────────────────┬──────────────────────────────────────┘
                      │
                      │ Firewall / SSL
                      │
┌─────────────────────▼──────────────────────────────────────┐
│                    VPS PERIMETER                            │
│                                                             │
│  Nginx exposes:                                             │
│  - Port 443 (HTTPS) - Medusa API                            │
│  - Port 80 (HTTP) - Redirect to HTTPS                       │
└─────────────────────┬──────────────────────────────────────┘
                      │
                      │ Reverse proxy
                      │
┌─────────────────────▼──────────────────────────────────────┐
│              INTERNAL DOCKER NETWORK                        │
│                                                             │
│  Only accessible from within Docker network:                │
│  - Meilisearch (7700) ← NOT EXPOSED TO INTERNET            │
│  - PostgreSQL (5432)                                        │
│  - Redis (6379)                                             │
│  - Medusa Worker                                            │
│                                                             │
│  Container-to-container communication only                  │
└─────────────────────────────────────────────────────────────┘
```

## Key Security Features

### ✅ Meilisearch Protection

1. **No public exposure**: Meilisearch port 7700 is NOT in nginx config
2. **Internal network only**: Only Medusa containers can reach it
3. **API key authentication**: All requests require valid API key
4. **Master key protection**: Master key never sent to clients

### ✅ Request Authentication Flow

```
External Request
    ↓
[1] Nginx SSL termination & rate limiting
    ↓
[2] Medusa authentication middleware (JWT/Session)
    ↓
[3] Medusa business logic & authorization
    ↓
[4] Meilisearch call with API key (internal only)
    ↓
[5] Results filtered by Medusa (not raw Meilisearch data)
    ↓
Response to client
```

## Environment Variable Reference

### Container: `medusa_meilisearch`

```bash
MEILI_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
MEILI_ENV=production
MEILI_HTTP_ADDR=0.0.0.0:7700
```

### Container: `medusa_backend_server_blue/green`

```bash
MEILISEARCH_HOST=${MEILISEARCH_HOST:-http://medusa_meilisearch:7700}
MEILISEARCH_API_KEY=${MEILISEARCH_API_KEY}
MEILISEARCH_MASTER_KEY=${MEILISEARCH_MASTER_KEY}
MEILISEARCH_PRODUCT_INDEX=${MEILISEARCH_PRODUCT_INDEX_NAME:-products}
MEILISEARCH_CATEGORY_INDEX=categories
```

### Container: `medusa_backend_worker_blue/green`

```bash
# Same as server containers
MEILISEARCH_HOST=...
MEILISEARCH_API_KEY=...
# etc.
```

## Port Mapping Summary

| Service               | Internal Port | External Port | Exposed to Internet?      |
| --------------------- | ------------- | ------------- | ------------------------- |
| Nginx                 | 80, 443       | 80, 443       | ✅ Yes                    |
| Medusa Server (Blue)  | 9000          | -             | ❌ No (via Nginx only)    |
| Medusa Server (Green) | 9002          | -             | ❌ No (via Nginx only)    |
| Medusa Worker (Blue)  | 9001          | -             | ❌ No                     |
| Medusa Worker (Green) | 9003          | -             | ❌ No                     |
| PostgreSQL            | 5432          | 5432          | ❌ No (internal only)     |
| Redis                 | 6379          | 6379          | ❌ No (internal only)     |
| **Meilisearch**       | **7700**      | **7700**      | **❌ No (internal only)** |
| Portainer             | 9000          | -             | ✅ Yes (via subdomain)    |
| Uptime Kuma           | 3001          | -             | ✅ Yes (via subdomain)    |

## Blue-Green Deployment States

### State 1: Blue Active

```
Nginx → medusa_backend_server_blue:9000
         ├─ PostgreSQL (shared)
         ├─ Redis (shared)
         └─ Meilisearch (shared) ← Persistent across deployments
```

### State 2: Deploying Green

```
Nginx → medusa_backend_server_blue:9000 (still serving traffic)

medusa_backend_server_green:9002 (starting up)
         ├─ PostgreSQL (shared) ← Same database
         ├─ Redis (shared) ← Same event bus
         └─ Meilisearch (shared) ← Same search index
```

### State 3: Switch to Green

```
Nginx → medusa_backend_server_green:9002 (now serving traffic)

medusa_backend_server_blue:9000 (stopping)
```

### State 4: Green Active

```
Nginx → medusa_backend_server_green:9002
         ├─ PostgreSQL (shared)
         ├─ Redis (shared)
         └─ Meilisearch (shared) ← Never stopped, indexes intact
```

## Key Takeaways

1. **Meilisearch is internal**: Never exposed directly to internet
2. **Persistent service**: Runs in base docker-compose, not affected by blue-green switches
3. **Shared across deployments**: Both blue and green use the same Meilisearch instance
4. **Security by design**: All external access goes through authenticated Medusa API
5. **Zero downtime**: Search remains available during entire deployment process
6. **Container networking**: Uses internal Docker DNS (container names, not IPs)
