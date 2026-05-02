# BulkXQR — Azure VPS Deployment Guide

## Architecture

```
GitHub repo
    │ push to main
    ▼
GitHub Actions (CI/CD)
    │ 1. lint + type-check
    │ 2. next build (on runner)
    │ 3. rsync artefact → Azure VM
    │ 4. SSH: npm ci + prisma migrate + pm2 reload
    ▼
Azure Virtual Machine (Ubuntu 22.04)
    ├── Nginx (reverse proxy, SSL termination)
    ├── PM2 (cluster mode, process manager)
    ├── Node.js 20 (Next.js 14)
    └── PostgreSQL (managed Azure DB or self-hosted)
```

---

## 1. Provision Azure VM

Recommended spec for a production BulkXQR instance:

| Resource | Recommendation |
|----------|---------------|
| VM Size | Standard_B2s (2 vCPU, 4 GB RAM) or better |
| OS | Ubuntu 22.04 LTS |
| Storage | 64 GB Premium SSD |
| Networking | Allow inbound 22, 80, 443 |
| Region | Choose closest to your users |

```bash
# Azure CLI — create VM
az vm create \
  --resource-group BulkXQR-rg \
  --name BulkXQR-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --ssh-key-values ~/.ssh/id_rsa.pub \
  --public-ip-sku Standard \
  --output table

# Open ports
az vm open-port --resource-group BulkXQR-rg --name BulkXQR-vm --port 80 --priority 100
az vm open-port --resource-group BulkXQR-rg --name BulkXQR-vm --port 443 --priority 110
```

---

## 2. First-time VPS Setup

SSH into the VM and run the setup script:

```bash
ssh azureuser@<VM_PUBLIC_IP>

# One-liner setup (after uploading scripts/vps-setup.sh or cloning the repo)
sudo bash scripts/vps-setup.sh
```

The script installs: Node.js 20, PM2, Nginx, Certbot (SSL), UFW firewall, fail2ban, Azure CLI.

### After setup — get SSL

Point your domain DNS `A` record to the VM IP, then:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d staging.yourdomain.com
```

---

## 3. Database

### Option A — Azure Database for PostgreSQL (Recommended)

```bash
az postgres flexible-server create \
  --resource-group BulkXQR-rg \
  --name BulkXQR-db \
  --admin-user BulkXQRadmin \
  --admin-password "YourStrongPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 15 \
  --output table
```

Copy the connection string for the `DATABASE_URL` secret.

### Option B — Self-hosted PostgreSQL on same VM

```bash
sudo apt-get install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER BulkXQR WITH PASSWORD 'yourpassword';"
sudo -u postgres psql -c "CREATE DATABASE BulkXQR OWNER BulkXQR;"
# DATABASE_URL=postgresql://BulkXQR:yourpassword@localhost:5432/BulkXQR
```

---

## 4. GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AZURE_VPS_HOST` | VM public IP or domain | `20.123.45.67` |
| `AZURE_VPS_USER` | SSH username | `azureuser` |
| `AZURE_VPS_SSH_KEY` | Full private key PEM | `-----BEGIN...` |
| `AZURE_VPS_PORT` | SSH port (default 22) | `22` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | Random 32+ char string | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your production URL | `https://yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSPX-...` |
| `RAZORPAY_KEY_ID` | Razorpay key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | `...` |
| `NEXT_PUBLIC_APP_NAME` | App name shown in UI | `BulkXQR` |
| `NEXT_PUBLIC_APP_URL` | Public URL | `https://yourdomain.com` |

### Optional Secrets

| Secret Name | Description |
|-------------|-------------|
| `STAGING_URL` | Staging environment URL |
| `STAGING_DATABASE_URL` | Staging database connection |
| `SLACK_WEBHOOK_URL` | Slack deploy notifications |
| `AZURE_STORAGE_ACCOUNT` | For DB backups to Azure Blob |
| `AZURE_STORAGE_KEY` | Azure Blob access key |

### Generate SSH key pair for GitHub Actions

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-BulkXQR" -f ~/.ssh/BulkXQR_deploy

# Add PUBLIC key to the VM
ssh azureuser@<VM_IP> "echo '$(cat ~/.ssh/BulkXQR_deploy.pub)' >> ~/.ssh/authorized_keys"

# Add PRIVATE key content to GitHub secret AZURE_VPS_SSH_KEY
cat ~/.ssh/BulkXQR_deploy
```

---

## 5. GitHub Environments (Optional but recommended)

Create two environments in **Settings → Environments**:

**`production`**
- Required reviewers: your team leads
- Deployment branches: `main` only
- Secrets: override any production-specific values

**`staging`**
- No required reviewers
- Deployment branches: `staging` only

---

## 6. Workflows Overview

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/deploy.yml` | Push to `main` or `staging` | Lint → Build → Deploy |
| `.github/workflows/rollback.yml` | Manual (Actions tab) | Roll back to a previous build |
| `.github/workflows/maintenance.yml` | Daily/weekly cron | DB backup, cleanup, dep audit |

---

## 7. Deployment Flow (What Happens on `git push`)

```
git push origin main
        │
        ▼
[Job 1: quality]
  ├── npm ci
  ├── prisma generate
  ├── tsc --noEmit         ← type errors block the deploy
  └── next lint
        │ (passes)
        ▼
[Job 2: build]
  ├── npm ci
  ├── prisma generate
  ├── next build           ← full production build on GitHub runner
  └── upload artifact      ← .next/ cached for deploy job
        │
        ▼
[Job 3: deploy-production]
  ├── download artifact
  ├── write .env.production
  ├── rsync → Azure VM
  └── SSH remote commands:
      ├── npm ci --omit=dev
      ├── prisma generate
      ├── prisma migrate deploy   ← zero-downtime schema migrations
      ├── pm2 reload BulkXQR      ← graceful reload, no downtime
      └── health check /api/health
```

---

## 8. Useful VPS Commands

```bash
# SSH into VM
ssh azureuser@<VM_IP>

# Check app status
pm2 status
pm2 monit                    # live dashboard

# View logs
pm2 logs BulkXQR             # live tail
pm2 logs BulkXQR --lines 200 # last 200 lines

# Restart / reload
pm2 reload BulkXQR           # graceful zero-downtime reload
pm2 restart BulkXQR          # hard restart

# Check Nginx
sudo nginx -t
sudo systemctl reload nginx

# Check SSL
sudo certbot certificates

# Disk usage
df -h

# App directory
ls -la /var/www/BulkXQR/
cat /var/www/BulkXQR/.env.production   # check env vars
```

---

## 9. Rollback

If a deploy breaks production:

1. Go to **GitHub → Actions → Rollback Production**
2. Click **Run workflow**
3. Enter the **Run ID** of the last good deploy (shown in Actions tab)
4. Type `ROLLBACK` to confirm
5. Click **Run workflow**

This downloads the old `.next/` build artefact and redeploys it without running migrations.

---

## 10. Monitoring

PM2 natively exposes metrics. For production, consider:

- **Azure Monitor** — VM CPU/memory alerts
- **Uptime Robot** — free external uptime monitoring on `/api/health`
- **PM2 Plus** (optional) — `pm2 plus` for web dashboard

```bash
# Set up Azure Monitor alert for CPU > 80%
az monitor metrics alert create \
  --name "BulkXQR-high-cpu" \
  --resource-group BulkXQR-rg \
  --scopes $(az vm show -g BulkXQR-rg -n BulkXQR-vm --query id -o tsv) \
  --condition "avg Percentage CPU > 80" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action $(az monitor action-group show -g BulkXQR-rg -n emailAlerts --query id -o tsv)
```

---

## 11. Troubleshooting

| Problem | Fix |
|---------|-----|
| `pm2 show BulkXQR` shows errored | `pm2 logs BulkXQR --err` to see the error |
| 502 Bad Gateway in Nginx | App crashed — `pm2 restart BulkXQR` |
| DB connection refused | Check `DATABASE_URL` in `.env.production` |
| Build fails on GitHub | Check Actions tab for error, fix and push |
| SSL expired | `sudo certbot renew` (auto-renews via cron) |
| Disk full | `df -h`, clean PM2 logs `pm2 flush` |
| Health check 503 | DB unreachable — check Azure DB firewall rules |

---

## 12. Scaling

When you need more capacity:

**Vertical** (easiest): Resize VM in Azure portal — no code changes needed.

**Horizontal** (advanced): Add a load balancer + multiple VMs. PM2 cluster mode already uses all cores per VM. For multiple VMs you'd need:
- Azure Load Balancer in front
- Shared session storage (Redis or DB sessions — NextAuth already uses DB sessions via Prisma)
- Shared `.env` via Azure Key Vault or environment injection

