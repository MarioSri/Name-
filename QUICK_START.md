# Quick Start Guide - Supabase Setup

## ✅ Configuration Complete

Your Supabase project has been configured with:
- **Project URL:** https://armorotbfruhfcwkrhpx.supabase.co
- **API Keys:** Updated in code and environment files
- **Google OAuth:** Configured in config.toml (needs credentials in Dashboard)

## 🚀 Next Steps

### 1. Install Supabase CLI (if not installed)

**Windows (PowerShell):**
```powershell
npm install -g supabase
```

**Linux/Mac:**
```bash
npm install -g supabase
```

### 2. Run Setup Script

**Windows:**
```powershell
.\setup-supabase.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-supabase.sh
./setup-supabase.sh
```

### 3. Manual Setup (if script doesn't work)

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref armorotbfruhfcwkrhpx

# Push migrations
cd backend/supabase/migrations
supabase db push
cd ../../..

# Deploy Edge Functions (optional)
cd supabase/functions
supabase functions deploy documents --project-ref armorotbfruhfcwkrhpx
# ... deploy other functions
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `https://armorotbfruhfcwkrhpx.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret
5. Go to Supabase Dashboard > Authentication > Providers > Google
6. Enable and add credentials

### 5. Enable Email/Password Auth

1. Go to Supabase Dashboard > Authentication > Settings
2. Enable "Enable email signup"
3. Configure email templates (optional)

### 6. Test Connection

```typescript
// In your frontend code
import { supabase } from '@/lib/supabase';
import { supabaseAuthService } from '@/services/SupabaseAuthService';

// Test email/password sign in
const { user, session, error } = await supabaseAuthService.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});

// Test Google OAuth
await supabaseAuthService.signInWithGoogle();

// Test realtime
import { realtimeService } from '@/services/SupabaseRealtimeService';

const subscription = realtimeService.subscribe({
  table: 'documents',
  event: '*',
  onInsert: (payload) => console.log('New document:', payload.new),
  onUpdate: (payload) => console.log('Updated:', payload.new),
});
```

## 📝 Files Updated

- ✅ `src/lib/supabase.ts` - Updated with new API keys
- ✅ `backend/src/config/supabase.ts` - Updated with new API keys
- ✅ `supabase/config.toml` - Google OAuth configured
- ✅ `src/services/SupabaseRealtimeService.ts` - Already exists and ready
- ✅ `src/services/SupabaseAuthService.ts` - New auth service created
- ✅ `.env` files - Created with credentials (gitignored)

## 🔒 Security Notes

- Never commit `.env` files to git
- Keep service role key secret (backend only)
- Use anon key in frontend
- Rotate keys if compromised

## 🐛 Troubleshooting

### CLI not found
```bash
npm install -g supabase
# Or use npx
npx supabase --version
```

### Link fails
- Check you're logged in: `supabase projects list`
- Verify project ref is correct
- Check network connection

### Migrations fail
- Check if tables already exist
- Review error messages
- Try running migrations one at a time

### Auth not working
- Verify API keys are correct
- Check redirect URLs match
- Ensure provider is enabled in Dashboard

## 📚 Documentation

- [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) - Detailed setup instructions
- [backend/BACKEND_ARCHITECTURE.md](./backend/BACKEND_ARCHITECTURE.md) - Backend architecture
- [backend/DEPLOYMENT_GUIDE.md](./backend/DEPLOYMENT_GUIDE.md) - Deployment guide

