# IAOMS Backend

Complete backend architecture for IAOMS (Institutional Operations and Management System) built on Supabase.

## Features Covered

✅ Document Management  
✅ Emergency Management  
✅ Approval Chain with Bypass  
✅ Workflow Routing (Sequential, Parallel, Reverse, Bi-Directional)  
✅ Document Tracking  
✅ Approval Center + History  
✅ LiveMeet+  
✅ Messages + Channels  
✅ Notifications  
✅ Approver Comments + Sharing  
✅ Digital Signatures (Documenso + Rekore Sign)  
✅ Recipient-based Document Visibility  
✅ Calendar Meetings  
✅ Dashboard Widgets  
✅ Real-time Update Triggers  
✅ Profiles Settings  
✅ Analytics Dashboard  

## Structure

```
backend/
├── supabase/
│   ├── migrations/
│   │   ├── 001_complete_iaoms_schema.sql    # Complete database schema
│   │   ├── 002_rls_policies.sql             # Row Level Security policies
│   │   ├── 003_triggers_and_functions.sql   # Database triggers & functions
│   │   └── 004_webhooks.sql                 # Webhook documentation
│   └── functions/                           # Supabase Edge Functions
│       ├── _shared/                         # Shared utilities
│       ├── documents/                       # Document management API
│       ├── approvals/                       # Approval chain API
│       ├── workflows/                       # Workflow routing API
│       ├── messages/                        # Messages & channels API
│       ├── meetings/                        # Calendar & LiveMeet+ API
│       ├── signatures/                      # Digital signatures API
│       ├── comments/                        # Comments & sharing API
│       ├── notifications/                   # Notifications API
│       ├── analytics/                       # Analytics API
│       └── dashboard/                       # Dashboard API
├── BACKEND_ARCHITECTURE.md                  # Complete architecture docs
├── DEPLOYMENT_GUIDE.md                      # Deployment instructions
└── deploy.sh                                # Deployment script
```

## Quick Start

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**
   ```bash
   supabase login
   ```

3. **Link Your Project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Deploy Everything**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

Or manually:
```bash
# Deploy migrations
cd supabase/migrations
supabase db push

# Deploy Edge Functions
cd ../functions
supabase functions deploy documents
supabase functions deploy approvals
# ... deploy all other functions
```

## Documentation

- **[BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)** - Complete architecture documentation
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment guide

## API Endpoints

All endpoints are available at:
```
https://your-project.supabase.co/functions/v1/{function-name}/{endpoint}
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete API reference.

## Real-time Features

The backend supports real-time updates via Supabase Realtime:

- Document status changes
- Approval actions
- New messages
- Notifications
- Meeting updates

Subscribe to changes using Supabase client:

```typescript
const channel = supabase
  .channel('updates')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'documents'
  }, (payload) => {
    console.log('Change:', payload)
  })
  .subscribe()
```

## Security

- ✅ Row Level Security (RLS) on all tables
- ✅ Authentication required for all Edge Functions
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Input validation

## Support

For issues or questions:
1. Check Supabase Dashboard logs
2. Review migration files
3. Check Edge Function logs
4. Review RLS policies

## License

See main project LICENSE file.

