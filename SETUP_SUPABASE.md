# Supabase Setup Instructions

## Project Configuration

**Project URL:** https://armorotbfruhfcwkrhpx.supabase.co  
**Project Ref:** armorotbfruhfcwkrhpx

## Step 1: Link Supabase CLI

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link to your project
supabase link --project-ref armorotbfruhfcwkrhpx
```

## Step 2: Push Database Migrations

```bash
# Navigate to migrations directory
cd backend/supabase/migrations

# Push all migrations to Supabase
supabase db push

# Or push from project root
cd ../../..
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.armorotbfruhfcwkrhpx.supabase.co:5432/postgres"
```

## Step 3: Configure Google OAuth in Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/armorotbfruhfcwkrhpx/auth/providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
4. Set redirect URL: `https://armorotbfruhfcwkrhpx.supabase.co/auth/v1/callback`

## Step 4: Enable Email/Password Auth

1. Go to Authentication > Settings
2. Enable "Enable email signup"
3. Configure email templates if needed

## Step 5: Deploy Edge Functions

```bash
# Deploy all Edge Functions
cd supabase/functions

supabase functions deploy documents --project-ref armorotbfruhfcwkrhpx
supabase functions deploy approvals --project-ref armorotbfruhfcwkrhpx
supabase functions deploy workflows --project-ref armorotbfruhfcwkrhpx
supabase functions deploy messages --project-ref armorotbfruhfcwkrhpx
supabase functions deploy meetings --project-ref armorotbfruhfcwkrhpx
supabase functions deploy signatures --project-ref armorotbfruhfcwkrhpx
supabase functions deploy comments --project-ref armorotbfruhfcwkrhpx
supabase functions deploy notifications --project-ref armorotbfruhfcwkrhpx
supabase functions deploy analytics --project-ref armorotbfruhfcwkrhpx
supabase functions deploy dashboard --project-ref armorotbfruhfcwkrhpx
```

## Step 6: Update Environment Variables

The `.env` file has been created with your Supabase credentials. Make sure to:

1. Add `.env` to `.gitignore` (if not already)
2. Update frontend to use these variables
3. Restart your development server

## Step 7: Test Connection

```typescript
// Test Supabase connection
import { supabase } from '@/lib/supabase';

// Test authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password'
});

// Test realtime
const channel = supabase
  .channel('test')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents'
  }, (payload) => {
    console.log('Change:', payload);
  })
  .subscribe();
```

## Google OAuth Setup

### 1. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Configure:
   - Application type: Web application
   - Authorized redirect URIs: 
     - `https://armorotbfruhfcwkrhpx.supabase.co/auth/v1/callback`
     - `http://localhost:54321/auth/v1/callback` (for local dev)
6. Copy Client ID and Client Secret

### 2. Add to Supabase Dashboard

1. Go to Authentication > Providers > Google
2. Enable Google provider
3. Add Client ID and Client Secret
4. Save

### 3. Use in Frontend

```typescript
// Sign in with Google
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

## Troubleshooting

### Migration Errors
- Check if tables already exist
- Verify RLS policies
- Check foreign key constraints

### Authentication Issues
- Verify API keys are correct
- Check redirect URLs match
- Ensure Google OAuth is configured

### Realtime Not Working
- Check Supabase Realtime is enabled
- Verify RLS policies allow access
- Check network connectivity

## Next Steps

1. ✅ Migrations pushed
2. ✅ Edge Functions deployed
3. ⏳ Configure Google OAuth
4. ⏳ Test authentication
5. ⏳ Test realtime subscriptions

