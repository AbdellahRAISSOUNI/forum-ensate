# API Documentation

## Authentication APIs

### Student Authentication (NextAuth)

#### `POST /api/auth/[...nextauth]`

NextAuth.js endpoint for student authentication.

**Request Body:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:**
- Sets JWT cookie for authenticated session
- Returns session data

### Admin Authentication

#### `POST /api/admin/login`

Custom authentication endpoint for admin users.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Response:**
```json
{
  "ok": true
}
```
- Sets `admin_session` cookie for authenticated session

#### `POST /api/admin/bootstrap`

Creates an initial admin user. Protected by token.

**Query Parameters:**
- `token`: Must match `NEXTAUTH_SECRET` environment variable

**Request Body:**
```json
{
  "email": "admin@example.com",
  "name": "Administrator",
  "password": "adminpassword"
}
```

**Response:**
```json
{
  "ok": true,
  "email": "admin@example.com"
}
```

### User Registration

#### `POST /api/auth/register`

Register a new student user.

**Request Body:**
```json
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "status": "ENSA",
  "opportunityType": "PFE"
}
```

**Response:**
```json
{
  "id": "user_id",
  "name": "Student Name",
  "email": "student@example.com",
  "role": "student"
}
```

## Admin APIs

### User Management

#### `GET /api/admin/users`

Get a list of users with pagination and filtering options.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `role`: Filter by role (optional)
- `status`: Filter by status (optional)

**Response:**
```json
{
  "users": [
    {
      "_id": "user_id",
      "name": "User Name",
      "email": "user@example.com",
      "role": "student",
      "status": "ENSA",
      "opportunityType": "PFE",
      "isCommittee": false,
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

#### `POST /api/admin/users?action=toggle-committee`

Toggle a user's committee status.

**Request Body:**
```json
{
  "userId": "user_id"
}
```

## Student Queue & Interviews

### `GET /api/student/companies`
Returns active companies with queue info for selection.

### `POST /api/student/select-companies`
Creates interviews for selected companies and assigns priorities/positions.

### `GET /api/student/interviews`
Returns active and historical interviews for the authenticated student.

### `PATCH /api/student/interviews`
Actions on interviews: `cancel`, `reschedule`.

### `GET /api/student/queue-status`
Returns current positions for the student's active interviews.

### `GET /api/student/my-interviews`
Returns all student's interviews with details.

### `GET /api/student/notifications`
Returns upcoming interviews (position <= 3) and status changes.

## Committee Interview Management

### `GET /api/committee/room-queue`
Returns the room assigned to the committee member with current queue and interview status.

### `POST /api/committee/start-interview`
Starts an interview by updating status to IN_PROGRESS and setting startedAt timestamp.

**Request Body:**
```json
{
  "interviewId": "interview_id"
}
```

### `POST /api/committee/end-interview`
Completes an interview by updating status to COMPLETED, setting completedAt, and triggering queue updates.

**Request Body:**
```json
{
  "interviewId": "interview_id"
}
```

### `POST /api/committee/mark-absent`
Marks a student as absent by updating status to CANCELLED and recalculating queue positions.

**Request Body:**
```json
{
  "interviewId": "interview_id"
}
```

## Queue Management

Priority calculation and queue assignment are implemented in `src/lib/queueManager.ts`.

- calculatePriority(user, opportunityType)
- assignQueuePositions(companyId)
- checkConflicts(studentId, newCompanyId)

## Interview State Management

Interview state management functions are implemented in `src/lib/interviewManager.ts`.

- startInterview(interviewId, committeeId)
- endInterview(interviewId, committeeId)
- markStudentAbsent(interviewId)
- getNextStudent(companyId)
- getRoomQueue(committeeId)
