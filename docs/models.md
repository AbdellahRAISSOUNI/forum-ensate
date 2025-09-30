# Database Models

The application uses MongoDB with Mongoose for data modeling. Below are the key models used in the system.

## User Model

**File:** `src/models/User.ts`

Represents students and committee members in the system.

```typescript
interface UserDocument extends mongoose.Document {
    name: string;
    email: string;
    passwordHash: string; // stored hashed
    role: 'student' | 'committee';
    status?: 'ENSA' | 'EXTERNE'; // for students
    opportunityType?: 'PFA' | 'PFE' | 'STAGE_OBSERVATION' | 'EMPLOI'; // for students
    isCommittee: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

**Indexes:**
- `email`: Unique index

## Admin Model

**File:** `src/models/Admin.ts`

Represents system administrators with special privileges.

```typescript
interface AdminDocument extends mongoose.Document {
    email: string;
    name?: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
}
```

**Indexes:**
- `email`: Unique index

## Company Model

**File:** `src/models/Company.ts`

Represents companies participating in the forum.

```typescript
interface CompanyDocument extends mongoose.Document {
    name: string;
    sector: string;
    website?: string;
    estimatedInterviewDuration?: number; // minutes
    room?: Types.ObjectId; // Reference to Room
    logo?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

## Room Model

**File:** `src/models/Room.ts`

Represents physical rooms where interviews take place.

```typescript
interface RoomDocument extends mongoose.Document {
    name: string;
    location: string;
    company?: Types.ObjectId; // Company assigned to this room
    committeeMembers: Types.ObjectId[]; // Users
    currentInterview?: Types.ObjectId; // Interview
    createdAt: Date;
    updatedAt: Date;
}
```

## Interview Model

**File:** `src/models/Interview.ts`

Represents student interviews with companies.

```typescript
interface InterviewDocument extends mongoose.Document {
    student: Types.ObjectId; // User
    company: Types.ObjectId; // Company
    status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    queuePosition: number;
    priority: number;
    scheduledTime?: Date;
    startedAt?: Date;
    completedAt?: Date;
    notificationSent: boolean;
    createdAt: Date;
    updatedAt: Date;
}
```

**Indexes:**
- `student`: Index
- `company`: Index
- `status`: Index
- Compound index on `(company, queuePosition)` (unique)

## ForumSettings Model

**File:** `src/models/ForumSettings.ts`

Global settings for the forum event.

```typescript
interface ForumSettingsDocument extends mongoose.Document {
    forumStartDate: Date;
    forumEndDate: Date;
    isRegistrationOpen: boolean;
    welcomeMessage: string; // in French
    createdAt: Date;
    updatedAt: Date;
}
```

## Relationships

- **User** ↔ **Interview**: One-to-many (a student can have multiple interviews)
- **Company** ↔ **Interview**: One-to-many (a company can have multiple interviews)
- **Company** ↔ **Room**: One-to-one (a company is assigned to one room)
- **Room** ↔ **User**: Many-to-many (committee members assigned to rooms)
- **Room** ↔ **Interview**: One-to-one (current interview in a room)
