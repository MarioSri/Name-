# IAOMS Documentation

This folder contains all documentation for the Integrated Automated Office Management System (IAOMS).

## 📁 Documentation Structure

### Getting Started
- [START_APP.md](START_APP.md) - How to start the application
- [START_HERE_BACKEND.md](START_HERE_BACKEND.md) - Backend setup guide
- [INSTALLATION_COMPLETE.md](INSTALLATION_COMPLETE.md) - Installation verification
- [ROLE_LOGIN_GUIDE.md](ROLE_LOGIN_GUIDE.md) - User roles and login guide

### Architecture & Implementation
- [FULL_STACK_ARCHITECTURE.md](FULL_STACK_ARCHITECTURE.md) - System architecture overview
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
- [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) - Current implementation status

### Approval System
- [COMPLETE_APPROVAL_SYSTEM_SUMMARY.md](COMPLETE_APPROVAL_SYSTEM_SUMMARY.md) - Complete approval system overview
- [APPROVAL_CHAIN_UPDATE.md](APPROVAL_CHAIN_UPDATE.md) - Approval chain configuration
- [APPROVAL_CHAIN_BYPASS_*.md](.) - Various bypass configuration docs

### Document Management
- [DOCUMENSO_*.md](.) - Documenso integration documentation
- [SIGNATURE_*.md](.) - Signature features documentation
- [WATERMARK_*.md](.) - Watermark features documentation

### Real-time Features
- [REAL_TIME_IMPLEMENTATION.md](REAL_TIME_IMPLEMENTATION.md) - Real-time features
- [SUPABASE_REALTIME_INTEGRATION.md](SUPABASE_REALTIME_INTEGRATION.md) - Supabase realtime setup

### Meeting & Calendar
- [LIVEMEET_*.md](.) - Live meeting features
- [MEETING_LINKS_API_SETUP_GUIDE.md](MEETING_LINKS_API_SETUP_GUIDE.md) - Meeting API setup
- [CALENDAR_*.md](.) - Calendar features

### Blockchain & Security
- [BLOCKCHAIN_*.md](.) - Blockchain integration guides
- [FACE_*.md](.) - Face authentication features
- [DEEPFACE_*.md](.) - DeepFace setup

### Backend
- [BACKEND_START_GUIDE.md](BACKEND_START_GUIDE.md) - Backend startup guide
- [BACKEND_README.md](BACKEND_README.md) - Backend documentation
- [BACKEND_*.md](.) - Other backend documentation

### Testing & Debugging
- [TEST_*.md](.) - Testing guides
- [TROUBLESHOOT_*.md](.) - Troubleshooting guides
- [DEBUG_*.md](.) - Debugging guides

---

## Environment Configuration

All API keys and sensitive configuration should be stored in the root `.env` file.  
See `/.env` for the template with all available configuration options.

**Required Environment Variables:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Optional Environment Variables:**
- Google API keys for calendar/meet integration
- Microsoft Azure keys for Teams integration
- Zoom API keys for meeting integration
- Pinata keys for IPFS/blockchain features
