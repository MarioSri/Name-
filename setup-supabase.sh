#!/bin/bash

# IAOMS Supabase Setup Script (Linux/Mac)
# This script sets up Supabase CLI, links project, and pushes migrations

set -e

echo "🚀 Starting Supabase Setup..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "📦 Supabase CLI not found. Installing..."
    echo "Please install Supabase CLI:"
    echo "npm install -g supabase"
    echo ""
    echo "Or download from: https://github.com/supabase/cli/releases"
    exit 1
fi

echo "✅ Supabase CLI found"

# Project configuration
PROJECT_REF="armorotbfruhfcwkrhpx"
PROJECT_URL="https://armorotbfruhfcwkrhpx.supabase.co"

echo ""
echo "📋 Project Configuration:"
echo "  Project Ref: $PROJECT_REF"
echo "  Project URL: $PROJECT_URL"
echo ""

# Step 1: Login (if not already)
echo "🔐 Step 1: Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "Please login to Supabase:"
    echo "supabase login"
    exit 1
fi
echo "✅ Already logged in"

# Step 2: Link project
echo ""
echo "🔗 Step 2: Linking to project..."
supabase link --project-ref "$PROJECT_REF"
echo "✅ Project linked successfully"

# Step 3: Push migrations
echo ""
echo "📤 Step 3: Pushing database migrations..."
cd backend/supabase/migrations
supabase db push
echo "✅ Migrations pushed successfully"
cd ../../..

# Step 4: Deploy Edge Functions
echo ""
echo "⚡ Step 4: Deploying Edge Functions..."
cd supabase/functions

FUNCTIONS=(
    "documents"
    "approvals"
    "workflows"
    "messages"
    "meetings"
    "signatures"
    "comments"
    "notifications"
    "analytics"
    "dashboard"
)

for func in "${FUNCTIONS[@]}"; do
    echo "  Deploying $func..."
    if supabase functions deploy "$func" --project-ref "$PROJECT_REF"; then
        echo "  ✅ $func deployed"
    else
        echo "  ⚠️ $func deployment failed (may not exist yet)"
    fi
done

cd ../..

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure Google OAuth in Supabase Dashboard"
echo "2. Enable Email/Password auth in Authentication settings"
echo "3. Test the connection with your frontend"
echo ""
echo "See SETUP_SUPABASE.md for detailed instructions"

