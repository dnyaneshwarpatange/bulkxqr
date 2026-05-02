@echo off
echo ============================================
echo   QRForge Local Development Setup
echo ============================================
echo.

REM Check if .env exists
if not exist .env (
    echo [1/4] Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo  IMPORTANT: Open .env and fill in your credentials before continuing!
    echo  Required: DATABASE_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    echo.
    pause
) else (
    echo [1/4] .env file found, skipping copy.
)

echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo [3/4] Setting up database (pushing Prisma schema)...
call ./node_modules/.bin/prisma generate
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: Database setup failed. Check your DATABASE_URL in .env
    pause
    exit /b 1
)

echo [4/4] Starting development server...
call npm run dev
