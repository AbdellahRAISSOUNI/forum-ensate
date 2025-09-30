# Forum ENSA Tétouan - Documentation

## Project Overview

Forum ENSA Tétouan is a web application designed to manage the interview process during job fairs at ENSA Tétouan. The platform facilitates interactions between students, companies, and committee members.

### Key Features

- **User Authentication**: Separate authentication flows for students and administrators
- **Interview Management**: Queue system for student interviews with companies
- **Admin Dashboard**: User management and system configuration
- **Student Dashboard**: View and manage interview status
- **Committee Dashboard**: Manage interviews and room queues
- **Notifications**: Real-time polling with toast notifications when your turn approaches

### Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS, App Router
- **Backend**: Next.js API Routes (serverless)
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js for students, Custom cookie auth for admins

### Project Structure

```
forum-ensate/
├── src/
│   ├── app/
│   │   ├── (auth)/           # Authentication pages
│   │   ├── (dashboard)/      # Protected dashboard pages
│   │   ├── (public)/         # Public landing pages
│   │   └── api/              # API routes
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Utilities and helpers
│   └── models/               # MongoDB schema definitions
├── docs/                     # Project documentation
└── public/                   # Static assets
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run the development server: `npm run dev`
5. Seed admin user: `npm run seed:admin`
6. Optional: Add a `public/notification.mp3` sound file for audible notifications

## Environment Variables

```
MONGODB_URI=           # MongoDB connection string
NEXTAUTH_SECRET=       # Secret for NextAuth.js
NEXTAUTH_URL=          # Base URL for NextAuth.js (http://localhost:3000 in development)
```

## New Endpoints

- `GET /api/student/companies`
- `POST /api/student/select-companies`
- `GET /api/student/interviews`
- `PATCH /api/student/interviews`
- `GET /api/student/queue-status`
- `GET /api/student/my-interviews`
- `GET /api/student/notifications`
- `GET /api/committee/room-queue`
- `POST /api/committee/start-interview`
- `POST /api/committee/end-interview`
- `POST /api/committee/mark-absent`

## Queue Manager

Located at `src/lib/queueManager.ts` providing:

- `calculatePriority(user, opportunityType)` per business rules
- `assignQueuePositions(companyId)` applying 3-2-2 pattern (committee/externe/ENSA)
- `checkConflicts(studentId, newCompanyId)` to detect overlaps

## Interview Manager

Located at `src/lib/interviewManager.ts` providing:

- `startInterview(interviewId, committeeId)` validates access and updates status
- `endInterview(interviewId, committeeId)` completes interview and triggers queue updates
- `markStudentAbsent(interviewId)` handles no-shows
- `getNextStudent(companyId)` finds next waiting student
- `getRoomQueue(committeeId)` gets room assignments and queue status
