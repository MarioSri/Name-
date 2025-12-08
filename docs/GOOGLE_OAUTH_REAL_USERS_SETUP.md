# 🔐 Google OAuth + Real Users Setup Guide for IAOMS

## Overview
This guide helps you set up **Google OAuth authentication** with **real institutional users** for production.

---

## 📋 Step 1: Edit the Seed File with Real Users

Open `supabase/migrations/002_seed_recipients.sql` and replace all placeholder values:

### Example - Before:
```sql
(
  'principal-001',
  NULL,
  'Dr. [PRINCIPAL_FULL_NAME]',               -- ← REPLACE
  '[principal]@[yourdomain].edu',            -- ← REPLACE
  ...
)
```

### Example - After:
```sql
(
  'principal-001',
  NULL,
  'Dr. Rajesh Kumar',                        -- Real name
  'rajesh.kumar@yourschool.edu',             -- Real Google email
  ...
)
```

### ⚠️ CRITICAL Rules:
1. **Email MUST match Google account** - The email field must exactly match what users use to sign in with Google
2. **google_id stays NULL** - It will be auto-filled when user first logs in
3. **Use institutional Google Workspace** - If your school uses Google Workspace (G Suite), use those emails

---

## 📋 Step 2: Enable Google OAuth in Supabase

### 2.1 Go to Supabase Dashboard
1. Navigate to: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and enable it

### 2.2 Create Google OAuth Credentials
1. Go to: https://console.cloud.google.com/
2. Create a new project (or use existing)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Choose **Web application**
6. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   (Replace YOUR_PROJECT_REF with your Supabase project reference)

### 2.3 Copy Credentials to Supabase
- Copy **Client ID** and **Client Secret** from Google Console
- Paste them in Supabase Authentication → Providers → Google

---

## 📋 Step 3: Update Your Frontend Code

The AuthContext already supports Google OAuth. Make sure your `.env` file has:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

### Google Sign-In Button Code (already in your app):
```typescript
const loginWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    }
  });
};
```

---

## 📋 Step 4: Run Migrations

After editing the seed file with real users:

### Option A: Fresh Setup (Recommended)
```sql
-- In Supabase SQL Editor:
-- 1. Run 001_create_iaoms_schema.sql first
-- 2. Run 002_seed_recipients.sql second
```

### Option B: Update Existing Users
```sql
-- Clear existing recipients and re-seed
TRUNCATE TABLE recipients CASCADE;
-- Then run 002_seed_recipients.sql
```

---

## 📋 Step 5: User Matching Logic

When a user signs in with Google, the system:

1. Gets their Google email from the OAuth response
2. Looks up in `recipients` table: `WHERE email = google_email`
3. If found, updates their `google_id` field with their Google UID
4. Creates their session with full role info

### Code in AuthContext.tsx:
```typescript
// After Google OAuth success
const { data: { user } } = await supabase.auth.getUser();

// Match to institutional user
const { data: recipient } = await supabase
  .from('recipients')
  .select('*')
  .eq('email', user.email)
  .single();

if (recipient) {
  // User found - update google_id if needed
  if (!recipient.google_id) {
    await supabase
      .from('recipients')
      .update({ google_id: user.id })
      .eq('email', user.email);
  }
  // Set user context with role info
}
```

---

## 🔒 Security Considerations

### 1. Restrict Domain (Recommended)
In Google Cloud Console, restrict to your domain:
- Go to OAuth consent screen
- Add your domain under "Authorized domains"

### 2. Supabase Auth Restrictions
In Supabase Dashboard → Authentication → Settings:
- Enable email restrictions to only allow `@yourschool.edu`

### 3. Row Level Security
Make sure RLS policies check user roles:
```sql
-- Example: Only principal can delete documents
CREATE POLICY "principal_delete_documents"
ON documents FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM recipients 
    WHERE google_id = auth.uid()
    AND role = 'PRINCIPAL'
  )
);
```

---

## 📊 Sample Real User Data

Here's a complete example for an engineering college:

```sql
-- Principal
('principal-001', NULL, 'Dr. Suresh Patel', 'suresh.patel@abc-engineering.edu', 'PRINCIPAL', 'PRINCIPAL', 'Administration', 'Main Campus', 'Principal', true, 1, true, '{}'::jsonb),

-- Registrar
('registrar-001', NULL, 'Prof. Meera Sharma', 'meera.sharma@abc-engineering.edu', 'REGISTRAR', 'REGISTRAR', 'Administration', 'Main Campus', 'Registrar', true, 2, true, '{}'::jsonb),

-- HOD CSE
('hod-cse-001', NULL, 'Dr. Anil Kumar', 'anil.kumar@abc-engineering.edu', 'HOD', 'HOD', 'Computer Science', 'Main Campus', 'Head of Department - CSE', true, 3, true, '{}'::jsonb),

-- Faculty
('faculty-cse-001', NULL, 'Mr. Rahul Verma', 'rahul.verma@abc-engineering.edu', 'EMPLOYEE', 'EMPLOYEE', 'Computer Science', 'Main Campus', 'Assistant Professor', true, 5, true, '{}'::jsonb)
```

---

## 🧪 Testing

1. **Add yourself first**: Add your own Google email as a test user
2. **Test login**: Sign in with Google and verify you appear in the system
3. **Check role**: Verify your role/department appears correctly
4. **Test approval flow**: Create a test document and verify routing works

---

## ❓ FAQ

### Q: What if a user doesn't have a Google account?
A: They need a Google account. For institutional use, Google Workspace is recommended.

### Q: Can I use personal Gmail addresses?
A: Yes, but institutional emails are recommended for security.

### Q: How do I add new users later?
A: Either:
1. Add them via Supabase SQL Editor
2. Create an Admin UI to manage users (recommended)
3. Use `INSERT INTO recipients (...) VALUES (...)` 

### Q: What happens if someone leaves the institution?
A: Set their `is_active = false` to disable their account without deleting data.

---

## 🚀 Quick Start Checklist

- [ ] Edit `002_seed_recipients.sql` with real user emails
- [ ] Enable Google OAuth in Supabase dashboard
- [ ] Create Google Cloud OAuth credentials
- [ ] Configure redirect URI
- [ ] Run seed migration
- [ ] Test login with your own account
- [ ] Verify role-based access works

---

## Need Help?

- Supabase Auth Docs: https://supabase.com/docs/guides/auth
- Google OAuth Setup: https://supabase.com/docs/guides/auth/social-login/auth-google
