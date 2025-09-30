# Role Switching & Session Management Guide

## ✅ What I Fixed

### **Issue**: Role changes in database not reflected in user sessions
When you changed a user's role from "student" to "committee" in MongoDB, they still saw the student dashboard because NextAuth.js was using cached JWT token data.

### **Solutions Implemented**:

1. **🔄 Enhanced Session Refresh**
   - Updated NextAuth configuration to refresh user data every 60 seconds
   - Sessions now automatically detect role changes from the database
   - Added `updateAge: 60` to force more frequent session updates

2. **🚪 Logout Buttons**
   - Added logout buttons to both student and committee dashboards
   - Users can manually sign out and back in to refresh their session

3. **🔧 Manual Session Refresh**
   - Added "Actualiser session" button to both dashboards
   - Allows users to force refresh their session without logging out

4. **📍 Smart Redirects**
   - Login page now redirects users to the correct dashboard based on their current role
   - Student dashboard redirects committee members to committee dashboard
   - Committee dashboard protects against student access

5. **👀 Session Monitoring**
   - Added background session monitoring component
   - Automatically checks for role changes every 30 seconds

## 🔧 How to Test Role Switching

### **Method 1: Use the Manual Refresh Button**
1. Change user role in MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "user@example.com" }, 
     { $set: { role: "committee", isCommittee: true } }
   )
   ```
2. Click the **"Actualiser session"** button on the dashboard
3. User should be redirected to the appropriate dashboard

### **Method 2: Wait for Automatic Refresh**
1. Change user role in MongoDB
2. Wait up to 60 seconds for automatic session refresh
3. User will be automatically redirected

### **Method 3: Logout and Login**
1. Change user role in MongoDB
2. Click **"Se déconnecter"** button
3. Log back in - user will be directed to correct dashboard

## 🚨 Troubleshooting

### **If role still doesn't update:**

1. **Clear browser cache and cookies**
   ```
   - Chrome: F12 → Application → Storage → Clear storage
   - Firefox: F12 → Storage → Cookies → Delete all
   ```

2. **Force logout/login**
   - Click "Se déconnecter"
   - Clear browser data
   - Log back in

3. **Check database changes**
   ```javascript
   // Verify the role change was saved
   db.users.findOne({ email: "user@example.com" })
   ```

4. **Use incognito/private window**
   - Open new incognito window
   - Log in to see fresh session

## 📋 Database Commands

### **Make user a committee member:**
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

### **Make user a student:**
```javascript
db.users.updateOne(
  { email: "user@example.com" },
  { 
    $set: { 
      role: "student",
      isCommittee: false 
    } 
  }
)
```

### **Assign room to committee member:**
```javascript
// First, get the user ID
const user = db.users.findOne({ email: "committee@example.com" });

// Then assign to room
db.rooms.updateOne(
  { name: "Salle A" },
  { 
    $addToSet: { 
      committeeMembers: user._id 
    } 
  }
)
```

## 🎯 Expected Behavior

### **Student Role** → Redirects to `/etudiant/dashboard`
- Can see student interviews and notifications
- Access to company selection
- Cannot access committee functions

### **Committee Role** → Redirects to `/comite/dashboard`
- Can see room assignments and queue management
- Access to interview control buttons
- Cannot access student-only functions

## 🔍 Debug Information

### **Check current session in browser console:**
```javascript
// In browser dev tools console
console.log('Current session:', await fetch('/api/auth/session').then(r => r.json()));
```

### **Monitor API calls:**
- Open browser Network tab
- Look for calls to `/api/student/*` vs `/api/committee/*`
- Verify correct endpoints are being called

### **Session refresh logs:**
- Check browser console for session refresh messages
- Look for "Error refreshing token" messages

The system now provides multiple ways to handle role changes gracefully, so users should be redirected to the correct dashboard based on their current database role within 60 seconds or immediately when using the manual refresh button.
