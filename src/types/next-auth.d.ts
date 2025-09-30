import { UserRole, StudentStatus, OpportunityType } from '@/models/User';
import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      status?: string;
      opportunityType?: string;
    }
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status?: string;
    opportunityType?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name: string;
    email: string;
    role: string;
    status?: string;
    opportunityType?: string;
  }
}