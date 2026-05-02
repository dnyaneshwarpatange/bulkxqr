#!/bin/bash
# BulkXQR VPS Setup Script
# Run as root on a fresh Ubuntu 22.04 / 24.04 server
# Usage: bash setup-vps.sh yourdomain.com your@email.com

set -e

DOMAIN=${1:-"yourdomain.com"}
EMAIL=${2:-"admin@yourdomain.com"}
APP_DIR="/var/www/BulkXQR"
DB_NAME="BulkXQR_db"
DB_USER="BulkXQR_user"
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

log "Starting BulkXQR VPS Setup for $DOMAIN"

apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl wget git ufw fail2ban nginx certbot python3-certbot-nginx build-essential

# Node.js 20 LTS
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# PM2
npm install -g pm2 --quiet

# PostgreSQL
if ! command -v psql &>/dev/null; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq && apt-get install -y -qq postgresql-16
fi
systemctl enable postgresql && systemctl start postgresql

sudo -u postgres psql -c "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

mkdir -p $APP_DIR /var/log/BulkXQR
chown -R www-data:www-data $APP_DIR /var/log/BulkXQR

# Firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh && ufw allow 80/tcp && ufw allow 443/tcp
ufw --force enable

# Fail2ban
cat > /etc/fail2ban/jail.local << 'F2B'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
[sshd]
enabled = true
F2B
systemctl restart fail2ban

# Nginx config
cat > /etc/nginx/sites-available/BulkXQR << NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 50M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/BulkXQR /etc/nginx/sites-enabled/BulkXQR
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos -m ${EMAIL}

NEXTAUTH_SECRET=$(openssl rand -base64 32)
cat > ${APP_DIR}/.env << ENV
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="https://${DOMAIN}"
GOOGLE_CLIENT_ID="REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="REPLACE_WITH_YOUR_GOOGLE_CLIENT_SECRET"
RAZORPAY_KEY_ID="REPLACE_WITH_RAZORPAY_KEY_ID"
RAZORPAY_KEY_SECRET="REPLACE_WITH_RAZORPAY_KEY_SECRET"
NEXT_PUBLIC_RAZORPAY_KEY_ID="REPLACE_WITH_RAZORPAY_KEY_ID"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="REPLACE_WITH_EMAIL"
SMTP_PASS="REPLACE_WITH_APP_PASSWORD"
SMTP_FROM="BulkXQR <noreply@${DOMAIN}>"
NEXT_PUBLIC_APP_URL="https://${DOMAIN}"
NEXT_PUBLIC_APP_NAME="BulkXQR"
ENV

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   BulkXQR Server Setup Complete!  ✓      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "DB Name   : ${DB_NAME}"
echo "DB User   : ${DB_USER}"
echo "DB Pass   : ${DB_PASS}  <-- SAVE THIS!"
echo "App Dir   : ${APP_DIR}"
echo ""
echo "NEXT STEPS:"
echo "  1. cd ${APP_DIR} && git clone YOUR_REPO_URL ."
echo "  2. Edit .env (fill Google OAuth + Razorpay keys)"
echo "  3. npm run setup"
echo "  4. pm2 start ecosystem.config.js"
echo "  5. pm2 save && pm2 startup"
