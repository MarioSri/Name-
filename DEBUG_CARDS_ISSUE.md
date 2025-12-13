# Debug Guide: Cards Not Appearing

## Steps to Debug

1. **Open Browser Console** (F12)
2. **Submit a document** from Document Management
3. **Check console logs** for:
   - `📄 [Track Documents] trackDocuments changed:` - Should show documents from Supabase
   - `📄 [Track Documents] Current user:` - Should show your user info
   - `✅ [Track Documents]` or `❌ [Track Documents]` - Shows if cards are being filtered out

## Common Issues

### Issue 1: No documents in trackDocuments
- **Check**: Console log `📄 [Track Documents] trackDocuments changed: 0 documents`
- **Cause**: Hook not loading data from Supabase
- **Fix**: Check Supabase connection, check if user has submitted documents

### Issue 2: Documents loaded but filtered out
- **Check**: Console log shows `❌ [Track Documents]` with `shouldShow: false`
- **Cause**: Submitter matching logic failing
- **Fix**: Check if `submittedBy` matches `currentUserName` or `userName`

### Issue 3: Documents not converted properly
- **Check**: Console log shows documents but they're not in the right format
- **Cause**: DocumentData format doesn't match Document format
- **Fix**: Check conversion logic in useEffect

## Quick Fix: Temporarily Disable Filtering

To see ALL documents (for testing), temporarily change:

```typescript
const shouldShow = notRemoved && matchesSearch && matchesStatus && matchesType && (isMockDocument || isSubmitter());
```

To:

```typescript
const shouldShow = notRemoved && matchesSearch && matchesStatus && matchesType; // Show all for testing
```

This will show all documents regardless of submitter matching.

