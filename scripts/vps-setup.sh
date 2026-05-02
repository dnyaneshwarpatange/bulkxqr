#!/usr/bin/env bash
# ============================================================
#  BulkXQR — Azure VPS First-Time Setup Script
#  Run once as root on a fresh Ubuntu 22.04 / 24.04 VM:
#    curl -fsSL https://raw.githubusercontent.com/YOUR/BulkXQR/main/scripts/vps-setup.sh | sudo bash
# ============================================================
set -euo pipefail

APP_USER="azureuser"        # change if your VM user differs
APP_DIR="/var/www/BulkXQR"
STAGING_DIR="/var/www/BulkXQR-staging"
NODE_VERSION="20"
DOMAIN="yourdomain.com"     # ← replace with your domain

GREEN="\033[32m"; RESET="\033[0m"
log() { echo -e "${GREEN}[setup]${RESET} $*"; }

# ── 1. System packages ────────────────────────────────────────
log "Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
  curl wget git unzip build-essential \
  postgresql-client \
  nginx certbot python3-certbot-nginx \
  azure-cli ufw fail2ban

# ── 2. Node.js via nvm (user-level, survives updates) ─────────
log "Installing Node.js $NODE_VERSION via nvm..."
su - "$APP_USER" -c "
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  nvm install $NODE_VERSION
  nvm alias default $NODE_VERSION
  nvm use default
  node --version
  npm --version
"

# Symlink so root can also see node/npm
NODE_BIN=$(su - "$APP_USER" -c "source ~/.nvm/nvm.sh && which node")
ln -sfn "$NODE_BIN" /usr/local/bin/node
NPM_BIN=$(su - "$APP_USER" -c "source ~/.nvm/nvm.sh && which npm")
ln -sfn "$NPM_BIN" /usr/local/bin/npm

# ── 3. PM2 ────────────────────────────────────────────────────
log "Installing PM2..."
npm install -g pm2
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash
pm2 save

# ── 4. App directories ────────────────────────────────────────
log "Creating app directories..."
mkdir -p "$APP_DIR" "$STAGING_DIR"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR" "$STAGING_DIR"

# ── 5. Nginx ──────────────────────────────────────────────────
log "Configuring Nginx..."
cat > /etc/nginx/sites-available/BulkXQR << NGINX_EOF
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$host\$request_uri;
}

# Production
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL — filled in by certbot
    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options          "SAMEORIGIN"   always;
    add_header X-Content-Type-Options   "nosniff"      always;
    add_header X-XSS-Protection         "1; mode=block" always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Next.js static assets — long cache
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Public folder
    location /public/ {
        proxy_pass http://127.0.0.1:3000;
        add_header Cache-Control "public, max-age=86400";
    }

    # Everything else → Next.js
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           \$http_upgrade;
        proxy_set_header   Connection        "upgrade";
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        client_max_body_size 20M;
    }
}

# Staging (port 3001 on same VM)
server {
    listen 443 ssl http2;
    server_name staging.${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host            \$host;
        proxy_set_header   X-Real-IP       \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        client_max_body_size 20M;
    }
}
NGINX_EOF

ln -sfn /etc/nginx/sites-available/BulkXQR /etc/nginx/sites-enabled/BulkXQR
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ── 6. SSL via Let's Encrypt ──────────────────────────────────
log "Obtaining SSL certificate (update DOMAIN in this script first)..."
log "Run this manually after DNS is pointed to this VM:"
log "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} -d staging.${DOMAIN}"

# ── 7. Firewall ───────────────────────────────────────────────
log "Configuring UFW firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# ── 8. fail2ban ───────────────────────────────────────────────
log "Enabling fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

# ── 9. SSH hardening ──────────────────────────────────────────
log "Hardening SSH config..."
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'       /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?MaxAuthTries.*/MaxAuthTries 3/'              /etc/ssh/sshd_config
systemctl restart sshd

# ── 10. PM2 ecosystem file ────────────────────────────────────
log "Writing PM2 ecosystem file..."
cat > "$APP_DIR/ecosystem.config.js" << PM2_EOF
module.exports = {
  apps: [
    {
      name: 'BulkXQR',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/BulkXQR',
      instances: 'max',       // one per CPU core
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env_file: '/var/www/BulkXQR/.env.production',
      env: { NODE_ENV: 'production', PORT: 3000 },
      error_file: '/var/log/pm2/BulkXQR-error.log',
      out_file:   '/var/log/pm2/BulkXQR-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'BulkXQR-staging',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/BulkXQR-staging',
      instances: 1,
      max_memory_restart: '256M',
      env_file: '/var/www/BulkXQR-staging/.env.production',
      env: { NODE_ENV: 'production', PORT: 3001 },
      error_file: '/var/log/pm2/BulkXQR-staging-error.log',
      out_file:   '/var/log/pm2/BulkXQR-staging-out.log',
    },
  ],
};
PM2_EOF

mkdir -p /var/log/pm2
chown -R "$APP_USER":"$APP_USER" /var/log/pm2

log "
╔═══════════════════════════════════════════════════════╗
║   VPS setup complete!  Next steps:                   ║
║                                                       ║
║ 1. Point your domain DNS → this VM's public IP       ║
║ 2. Run:  certbot --nginx -d yourdomain.com ...       ║
║ 3. Add GitHub Secrets (see DEPLOYMENT.md)            ║
║ 4. Push to 'main' branch to trigger first deploy     ║
╚═══════════════════════════════════════════════════════╝
"
