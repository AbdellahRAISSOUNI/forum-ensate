import NextAuth, { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { User } from '@/models/User';
import { Admin } from '@/models/Admin';

export const authOptions: AuthOptions = {
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  events: {
    async signOut() {
      // Clear any cached data on signout
      console.log('User signed out - clearing all cached data');
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours only
    updateAge: 0, // Always fetch fresh data, no caching
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          await connectToDatabase();

          // First check for admin in Admin model
          const admin = await Admin.findOne({ email: credentials.email }).lean();
          if (admin) {
            const isValid = await bcrypt.compare(credentials.password, admin.passwordHash);
            if (isValid) {
              return {
                id: admin._id.toString(),
                name: admin.name || 'Administrator',
                email: admin.email,
                role: 'admin',
                status: 'ENSA',
                opportunityType: 'PFA',
              };
            }
          }

          // Then check for user (student, committee) in User model
          const user = await User.findOne({ email: credentials.email }).lean();
          if (user) {
            // Check password - handle both 'password' and 'passwordHash' fields
            const passwordField = user.password || user.passwordHash;
            if (passwordField) {
              const isValid = await bcrypt.compare(credentials.password, passwordField);
              if (isValid) {
                return {
                  id: user._id.toString(),
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  status: user.status || 'ENSA',
                  opportunityType: user.opportunityType || 'PFA',
                };
              }
            }
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Only set initial token data from user object during login
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.status = user.status;
        token.opportunityType = user.opportunityType;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        try {
          // ALWAYS fetch fresh user data from database - no caching
          await connectToDatabase();
          
          // Check if this is an admin user first
          if (token.role === 'admin') {
            const freshAdmin = await Admin.findById(token.id).lean();
            if (freshAdmin) {
              session.user.id = token.id;
              session.user.name = freshAdmin.name || 'Administrator';
              session.user.email = freshAdmin.email;
              session.user.role = 'admin';
              session.user.status = 'ENSA';
              session.user.opportunityType = 'PFA';
            } else {
              // Admin deleted - use token data
              session.user.id = token.id;
              session.user.name = token.name as string;
              session.user.email = token.email as string;
              session.user.role = 'admin';
              session.user.status = 'ENSA';
              session.user.opportunityType = 'PFA';
            }
          } else {
            // Check User model for students/committee
            const freshUser = await User.findById(token.id).lean();
            if (freshUser) {
              session.user.id = token.id;
              session.user.name = freshUser.name;
              session.user.email = freshUser.email;
              session.user.role = freshUser.role;
              session.user.status = freshUser.status;
              session.user.opportunityType = freshUser.opportunityType;
            } else {
              // User deleted - use token data as fallback
              session.user.id = token.id;
              session.user.name = token.name as string;
              session.user.email = token.email as string;
              session.user.role = token.role as string;
              session.user.status = token.status as string;
              session.user.opportunityType = token.opportunityType as string;
            }
          }
        } catch (error) {
          console.error('Error fetching fresh user data:', error);
          // On database error, use token data
          session.user.id = token.id;
          session.user.name = token.name as string;
          session.user.email = token.email as string;
          session.user.role = token.role as string;
          session.user.status = token.status as string;
          session.user.opportunityType = token.opportunityType as string;
        }
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };