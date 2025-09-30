# Authentication Flows

The application uses two separate authentication systems:

1. **NextAuth.js** for student authentication
2. **Custom cookie-based authentication** for admin users

## Student Authentication (NextAuth)

### Implementation

- **Configuration File**: `src/app/api/auth/[...nextauth]/route.ts`
- **Type Definitions**: `src/types/next-auth.d.ts`

### Flow

1. User submits login credentials at `/login`
2. NextAuth verifies credentials against the User model
3. If valid, NextAuth creates a JWT session
4. User is redirected to `/etudiant/dashboard`
5. Protected routes check session status using `useSession` hook

### Session Data

The session includes:

```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status?: string;
    opportunityType?: string;
  }
}
```

### Protection Mechanism

Student dashboard is protected with:

```typescript
const { data: session, status } = useSession();

useEffect(() => {
  if (status === "unauthenticated") {
    router.push("/login");
  }
}, [status, router]);
```

## Admin Authentication (Custom)

### Implementation

- **Login API**: `src/app/api/admin/login/route.ts`
- **Login Page**: `src/app/(auth)/admin/login/page.tsx`
- **Dashboard**: `src/app/(dashboard)/admin/dashboard/page.tsx`

### Flow

1. Admin submits credentials at `/admin/login`
2. API verifies credentials against the Admin model
3. If valid, API sets an HTTP-only cookie named `admin_session`
4. Admin is redirected to `/admin/dashboard`
5. Protected routes check for the presence of the cookie

### Cookie Details

```typescript
cookieStore.set(SESSION_COOKIE, String(admin._id), {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
});
```

### Protection Mechanism

Admin dashboard is protected with server-side cookie checking:

```typescript
const cookieStore = await cookies();
const session = cookieStore.get(SESSION_COOKIE);

if (!session?.value) {
  // Redirect to login
}
```

## Registration Process

1. User submits registration form at `/register`
2. API validates the form data using Zod
3. Password is hashed using bcrypt
4. User is created in the database with role 'student'
5. User is redirected to login page

## Logout Process

### Student Logout

Uses NextAuth's `signOut` function:

```typescript
const handleLogout = async () => {
  await signOut({ callbackUrl: '/' });
};
```

### Admin Logout

Manually clears the admin session cookie:

```typescript
document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
window.location.href = '/';
```
