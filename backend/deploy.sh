#!/bin/bash

# IAOMS Backend Deployment Script
# This script deploys all migrations and Edge Functions to Supabase

set -e

echo "🚀 Starting IAOMS Backend Deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Please install it:${NC}"
    echo "npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Supabase. Please run:${NC}"
    echo "supabase login"
    exit 1
fi

echo -e "${BLUE}📦 Step 1: Deploying database migrations...${NC}"
cd supabase/migrations

# Deploy migrations
supabase db push

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migrations deployed successfully${NC}"
else
    echo -e "${RED}❌ Migration deployment failed${NC}"
    exit 1
fi

cd ../..

echo -e "${BLUE}📦 Step 2: Deploying Edge Functions...${NC}"
cd supabase/functions

# List of functions to deploy
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

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo -e "${BLUE}Deploying ${func}...${NC}"
    supabase functions deploy "$func"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${func} deployed successfully${NC}"
    else
        echo -e "${RED}❌ ${func} deployment failed${NC}"
        exit 1
    fi
done

cd ../..

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure webhooks in Supabase Dashboard"
echo "2. Set up environment variables for Edge Functions"
echo "3. Test API endpoints"
echo "4. Configure external services (email, SMS, etc.)"

