#!/bin/bash
set -e
echo "============================================"
echo "  QRForge Local Development Setup"
echo "============================================"
echo

if [ ! -f .env ]; then
  echo "[1/4] Creating .env from .env.example..."
  cp .env.example .env
  echo
  echo " IMPORTANT: Edit .env and fill in your credentials before continuing!"
  echo " Required: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
  echo
  read -p "Press Enter after editing .env to continue..."
else
  echo "[1/4] .env file found."
fi

echo "[2/4] Installing dependencies..."
npm install

echo "[3/4] Setting up database..."
./node_modules/.bin/prisma generate
npx prisma db push

echo "[4/4] Starting development server..."
npm run dev
