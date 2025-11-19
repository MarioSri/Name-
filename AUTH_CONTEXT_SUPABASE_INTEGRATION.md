# Authentication Context - Supabase Integration

## Changes Made

### ✅ Removed Mock User Data
- **AuthContext.tsx**: Removed hardcoded mock users
- Now loads user data from Supabase `recipients` table during login
- Creates authenticated user from real database records

## Code Changes

### **Before (Mock Data)**
```typescript
const mockUser: User = {
  id: `user-${Date.now()}`,
  name: role === 'principal' ? 'Dr. Robert Smith' :
        role === 'registrar' ? 'Prof. Sarah Johnson' :
        role === 'hod' ? 'Dr. Rajesh Kumar' :
        role === 'program-head' ? 'Prof. Anita Sharma' :
        'Mr. John Doe',
  email: `${role}@hitam.org`,
  role: role as User['role'],
  department: role === 'hod' ? 'Computer Science & Engineering' : undefined,
  branch: role === 'hod' ? 'CSE' : undefined,
  permissions: getUserPermissions(role)
};
```

### **After (Supabase Data)**
```typescript
// Get recipients from Supabase
const recipients = await supabaseWorkflowService.getRecipients();

// Map role to database role_type
const roleTypeMap = {
  'principal': 'Principal',
  'registrar': 'Registrar',
  'hod': 'HOD',
  'program-head': 'Program Head',
  'employee': 'EMPLOYEE'
};

// Find matching recipient
const recipient = recipients.find(r => 
  r.role === roleType || 
  r.role_type === roleType
);

// Create user from database data
const authenticatedUser: User = {
  id: recipient.user_id,
  name: recipient.name,
  email: recipient.email,
  role: role as User['role'],
  department: recipient.department,
  branch: recipient.branch,
  avatar: recipient.avatar,
  permissions: getUserPermissions(role)
};
```

## Login Flow

```
User selects role (e.g., "principal")
    ↓
AuthContext.login(role)
    ↓
Query Supabase recipients table
    ↓
Find recipient matching role
    ↓
Create User object from recipient data
    ↓
Store in sessionStorage
    ↓
User authenticated
```

## Role Mapping

| UI Role | Database role_type |
|---------|-------------------|
| principal | Principal |
| registrar | Registrar |
| hod | HOD |
| program-head | Program Head |
| employee | EMPLOYEE |

## User Object Structure

```typescript
{
  id: string,              // From recipients.user_id
  name: string,            // From recipients.name
  email: string,           // From recipients.email
  role: string,            // From login selection
  department?: string,     // From recipients.department
  branch?: string,         // From recipients.branch
  avatar?: string,         // From recipients.avatar
  permissions: {           // Calculated from role
    canApprove: boolean,
    canViewAllDepartments: boolean,
    canManageWorkflows: boolean,
    canViewAnalytics: boolean,
    canManageUsers: boolean
  }
}
```

## Error Handling

### **No User Found**
```typescript
if (!recipient) {
  throw new Error(`No user found with role: ${role}`);
}
```

This will show an error if:
- No recipient exists in database with matching role
- Database connection fails
- Invalid role selected

## Benefits

✅ **Real Database Users**: All user data from Supabase
✅ **Dynamic Data**: Name, email, department from database
✅ **Consistent IDs**: Uses actual user_id from recipients table
✅ **Scalable**: Works with any number of users
✅ **No Hardcoding**: No mock names or emails

## Database Requirements

### **recipients table must have:**
```sql
- user_id (UUID or string)
- name (string)
- email (string)
- role (string) - e.g., 'Principal', 'HOD'
- role_type (string) - e.g., 'EMPLOYEE', 'Principal'
- department (string, optional)
- branch (string, optional)
- avatar (string, optional)
```

### **Example Records:**
```sql
INSERT INTO recipients (user_id, name, email, role, role_type, department, branch)
VALUES
  ('uuid-1', 'Dr. Robert Smith', 'principal@hitam.org', 'Principal', 'Principal', NULL, NULL),
  ('uuid-2', 'Prof. Sarah Johnson', 'registrar@hitam.org', 'Registrar', 'Registrar', NULL, NULL),
  ('uuid-3', 'Dr. Rajesh Kumar', 'hod@hitam.org', 'HOD', 'HOD', 'Computer Science', 'CSE'),
  ('uuid-4', 'Mr. John Doe', 'employee@hitam.org', 'Faculty', 'EMPLOYEE', 'CSE', NULL);
```

## Testing

1. **Login as Principal**: Should load Principal user from database
2. **Login as Employee**: Should load any EMPLOYEE user from database
3. **Check User Data**: Verify name, email, department match database
4. **No User**: Delete all users → Should show error
5. **Multiple Users**: Multiple employees → Should load first match

## Session Management

- User stored in **sessionStorage** (cleared on browser close)
- Permissions calculated from role (not stored in database)
- Avatar loaded from database if available
- Department/branch loaded from database if available
