# Document Submission Flow - Tracking Cards & Approval Cards

## Overview

When a document is submitted from **Document Management**, **Emergency Management**, or **Approval Chain with Bypass**, the system creates:

1. **Track Documents Card** - For the submitter to track document progress
2. **Approval Center Cards** - For each selected recipient to review and approve

This document explains **WHY** this happens and **HOW** it works.

---

## Why Both Cards Are Created

### 1. Track Documents Card (For Submitter)

**Purpose:** Allows the document submitter to:
- Track the document's progress through the approval workflow
- See which recipients have approved/rejected
- View workflow status, comments, and history
- Monitor document lifecycle

**Created In:** `documents` table in Supabase
**Visible To:** Document submitter (in Track Documents page)

### 2. Approval Center Cards (For Recipients)

**Purpose:** Allows each recipient to:
- Review the document assigned to them
- Approve or reject the document
- Add comments and signatures
- See their position in the approval chain

**Created In:** `approval_cards` table in Supabase
**Visible To:** Selected recipients (in Approval Center page)

---

## Submission Flow by Source

### 📄 Document Management

**Flow:**
```
1. User submits document with recipients
   ↓
2. System creates Document (tracking card) in Supabase
   ↓
3. System creates Approval Card(s) for recipients:
   - Sequential: ONE card with first recipient as current approver
   - Parallel: ONE card per recipient (all active simultaneously)
   ↓
4. Recipients see card in Approval Center
5. Submitter sees tracking card in Track Documents
```

**Code Location:**
- Submission: `src/pages/Documents.tsx` → `handleDocumentSubmit()`
- Supabase Creation: `src/hooks/useSupabaseRealTimeDocuments.ts` → `submitDocument()`
- Approval Card Creation: `src/services/SupabaseStorageService.ts` → `createApprovalCard()`

### 🚨 Emergency Management

**Flow:**
```
1. User submits emergency document with recipients
   ↓
2. System creates Document (tracking card) with is_emergency=true
   ↓
3. System creates Approval Card(s) based on routing:
   - Smart Delivery (Parallel): One card per recipient
   - Sequential: One card with first recipient as current
   ↓
4. Recipients receive urgent notification + approval card
5. Submitter tracks in Track Documents
```

**Code Location:**
- Submission: `src/components/EmergencyWorkflowInterface.tsx` → `handleEmergencySubmit()`
- Uses: `createEmergencyDocument()` which calls `submitDocument()`

### ⚙️ Approval Chain with Bypass

**Flow:**
```
1. User configures workflow and submits document
   ↓
2. System creates Document (tracking card) with workflow metadata
   ↓
3. System creates Approval Card(s) based on routing type:
   - Sequential: One card, moves through chain
   - Parallel: Multiple cards, all active
   - Bidirectional: Cards for forward and reverse flow
   ↓
4. Recipients see cards in Approval Center
5. Submitter tracks workflow progress
```

**Code Location:**
- Submission: `src/components/WorkflowConfiguration.tsx` → `handleSaveWorkflow()`
- Uses: `createApprovalChainDocument()` which calls `submitDocument()`

---

## Database Schema

### Documents Table (Tracking Cards)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  tracking_id TEXT UNIQUE,
  title TEXT,
  submitter_id TEXT,
  submitter_name TEXT,
  status TEXT, -- pending, approved, rejected
  routing_type TEXT, -- sequential, parallel
  workflow JSONB,
  ...
);
```

### Approval Cards Table (Approval Center)
```sql
CREATE TABLE approval_cards (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  tracking_card_id TEXT,
  title TEXT,
  current_approver_id UUID, -- Current recipient who should approve
  status TEXT, -- pending, approved, rejected
  routing_type TEXT,
  ...
);
```

### Approval Card Recipients (Junction Table)
```sql
CREATE TABLE approval_card_recipients (
  id UUID PRIMARY KEY,
  approval_card_id UUID REFERENCES approval_cards(id),
  recipient_id UUID, -- Recipient UUID
  approval_order INTEGER, -- Order in chain (1, 2, 3...)
  status TEXT, -- pending, approved, rejected
  ...
);
```

---

## How Recipients See Approval Cards

### Query Logic

When a recipient opens the Approval Center:

1. **System looks up recipient UUID** from `user_id` (e.g., "principal-001")
2. **Queries approval cards** where:
   - `current_approver_id = recipient UUID` (for sequential routing)
   - OR `recipient_id IN approval_card_recipients` (for parallel routing)
3. **Filters by status** = 'pending'
4. **Returns cards** to display in Approval Center

**Code Location:** `src/services/SupabaseStorageService.ts` → `getApprovalCardsByRecipient()`

### Sequential Routing Example

```
Document: "Budget Request"
Recipients: [HOD, Principal, Registrar]

Approval Card Created:
- current_approver_id: HOD UUID
- approval_card_recipients: [HOD, Principal, Registrar] (all linked)

HOD sees card → Approves → Card moves to Principal
Principal sees card → Approves → Card moves to Registrar
Registrar sees card → Approves → Document complete
```

### Parallel Routing Example

```
Document: "Meeting Minutes"
Recipients: [HOD, Principal, Registrar]

Approval Cards Created:
- Card 1: current_approver_id: HOD UUID
- Card 2: current_approver_id: Principal UUID
- Card 3: current_approver_id: Registrar UUID

All three recipients see their cards simultaneously
All can approve independently
```

---

## Verification Checklist

✅ **Document Management Submission:**
- [x] Document created in `documents` table
- [x] Approval card(s) created in `approval_cards` table
- [x] Recipients linked in `approval_card_recipients` table
- [x] Tracking card visible in Track Documents
- [x] Approval cards visible in Approval Center for recipients

✅ **Emergency Management Submission:**
- [x] Document created with `is_emergency=true`
- [x] Approval card(s) created with urgent priority
- [x] Recipients receive notifications
- [x] Cards visible in both Track Documents and Approval Center

✅ **Approval Chain with Bypass:**
- [x] Document created with workflow metadata
- [x] Approval card(s) created based on routing type
- [x] Workflow steps tracked in card metadata
- [x] Cards visible in both pages

---

## Troubleshooting

### Issue: Recipients Not Seeing Approval Cards

**Possible Causes:**
1. **Recipient UUID Mismatch**
   - Check: `approval_cards.current_approver_id` matches recipient UUID
   - Fix: Ensure `recipientDetails` includes correct UUIDs

2. **Recipients Not in Junction Table**
   - Check: `approval_card_recipients` has entries for the card
   - Fix: Verify `createApprovalCard()` adds recipients correctly

3. **Status Filter**
   - Check: Cards have `status='pending'`
   - Fix: Ensure cards are created with pending status

4. **User ID Resolution**
   - Check: `getApprovalCardsByRecipient()` resolves user_id to UUID
   - Fix: Verify recipient lookup in `recipients` table

### Debug Queries

```sql
-- Check if document was created
SELECT * FROM documents WHERE tracking_id = 'DOC-1234567890';

-- Check if approval cards were created
SELECT * FROM approval_cards WHERE document_id = '<document-uuid>';

-- Check if recipients are linked
SELECT * FROM approval_card_recipients 
WHERE approval_card_id = '<approval-card-uuid>';

-- Check recipient UUID
SELECT id, user_id, name FROM recipients WHERE user_id = 'principal-001';
```

---

## Summary

**Why Both Cards Are Created:**

1. **Tracking Card (Document)** = Submitter's view
   - Track progress, see workflow, monitor status

2. **Approval Card(s)** = Recipients' view
   - Review, approve/reject, add comments

**This dual-card system ensures:**
- ✅ Submitters can track their documents
- ✅ Recipients can review and approve
- ✅ Workflow is properly managed
- ✅ Real-time updates sync across both views

The system is working as designed! 🎉

