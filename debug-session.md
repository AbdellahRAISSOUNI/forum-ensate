# Debugging Role Update Issue

## What I Fixed

1. **Updated NextAuth session callback** to fetch fresh user data from database on each request
2. **Added role-based redirects** in login page and student dashboard
3. **Automatic role detection** will now work immediately after database role changes

## How to Test

1. **Change user role in database** (MongoDB):
   ```javascript
   db.users.updateOne(
     { email: "student@example.com" }, 
     { $set: { role: "committee", isCommittee: true } }
   )
   ```

2. **Refresh the page or navigate** - the session will automatically detect the new role

3. **Expected behavior**:
   - Student role → redirects to `/etudiant/dashboard`
   - Committee role → redirects to `/comite/dashboard`

## API Endpoints by Role

### Student APIs:
- GET /api/student/interviews
- GET /api/student/notifications
- GET /api/student/companies
- POST /api/student/select-companies

### Committee APIs:
- GET /api/committee/room-queue
- POST /api/committee/start-interview
- POST /api/committee/end-interview
- POST /api/committee/mark-absent

## Troubleshooting

If the role still doesn't update:
1. Clear browser cookies/localStorage
2. Sign out and sign in again
3. Check browser network tab for API calls
4. Verify user role in database

## Database Update Commands

To make a user committee member:
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $set: { 
      role: "committee",
      isCommittee: true 
    } 
  }
)
```

To assign a room to committee member:
```javascript
db.rooms.updateOne(
  { name: "Salle A" },
  { 
    $push: { 
      committeeMembers: ObjectId("user_id_here") 
    } 
  }
)
```
