# IAOMS Supabase Setup Script
# This script sets up Supabase CLI, links project, and pushes migrations

Write-Host "🚀 Starting Supabase Setup..." -ForegroundColor Green

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue

if (-not $supabaseInstalled) {
    Write-Host "📦 Supabase CLI not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please install Supabase CLI manually:" -ForegroundColor Yellow
    Write-Host "npm install -g supabase" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or download from: https://github.com/supabase/cli/releases" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green

# Project configuration
$PROJECT_REF = "armorotbfruhfcwkrhpx"
$PROJECT_URL = "https://armorotbfruhfcwkrhpx.supabase.co"

Write-Host ""
Write-Host "📋 Project Configuration:" -ForegroundColor Cyan
Write-Host "  Project Ref: $PROJECT_REF" -ForegroundColor White
Write-Host "  Project URL: $PROJECT_URL" -ForegroundColor White
Write-Host ""

# Step 1: Login (if not already)
Write-Host "🔐 Step 1: Checking Supabase login..." -ForegroundColor Yellow
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Supabase:" -ForegroundColor Yellow
    Write-Host "supabase login" -ForegroundColor Cyan
    exit 1
}
Write-Host "✅ Already logged in" -ForegroundColor Green

# Step 2: Link project
Write-Host ""
Write-Host "🔗 Step 2: Linking to project..." -ForegroundColor Yellow
supabase link --project-ref $PROJECT_REF
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Project linked successfully" -ForegroundColor Green

# Step 3: Push migrations
Write-Host ""
Write-Host "📤 Step 3: Pushing database migrations..." -ForegroundColor Yellow
Set-Location backend/supabase/migrations
supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to push migrations" -ForegroundColor Red
    Set-Location ../../..
    exit 1
}
Write-Host "✅ Migrations pushed successfully" -ForegroundColor Green
Set-Location ../../..

# Step 4: Deploy Edge Functions
Write-Host ""
Write-Host "⚡ Step 4: Deploying Edge Functions..." -ForegroundColor Yellow
Set-Location supabase/functions

$functions = @(
    "documents",
    "approvals",
    "workflows",
    "messages",
    "meetings",
    "signatures",
    "comments",
    "notifications",
    "analytics",
    "dashboard"
)

foreach ($func in $functions) {
    Write-Host "  Deploying $func..." -ForegroundColor Cyan
    supabase functions deploy $func --project-ref $PROJECT_REF
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ $func deployed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ $func deployment failed (may not exist yet)" -ForegroundColor Yellow
    }
}

Set-Location ../..

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Configure Google OAuth in Supabase Dashboard" -ForegroundColor White
Write-Host "2. Enable Email/Password auth in Authentication settings" -ForegroundColor White
Write-Host "3. Test the connection with your frontend" -ForegroundColor White
Write-Host ""
Write-Host "See SETUP_SUPABASE.md for detailed instructions" -ForegroundColor Yellow

