import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from './db';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Auto-create subscription for new users
        const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
        if (!sub) {
          await prisma.subscription.create({
            data: { userId: user.id, plan: 'free', status: 'active' },
          });
        }
        token.plan = sub?.plan ?? 'free';
        // Assign admin role from env whitelist
        const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase());
        const userEmail = user.email?.toLowerCase() ?? '';
        const isAdmin = adminEmails.includes(userEmail);
        if (isAdmin) {
          await prisma.user.update({ where: { id: user.id }, data: { role: 'admin' } });
        }
        token.role = isAdmin ? 'admin' : 'user';
      }
      if (trigger === 'update') {
        const sub = await prisma.subscription.findUnique({ where: { userId: token.id as string } });
        token.plan = sub?.plan ?? 'free';
        const dbUser = await prisma.user.findUnique({ where: { id: token.id as string }, select: { role: true } });
        token.role = dbUser?.role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        (session.user as any).plan = token.plan as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: { signIn: '/login', error: '/login' },
  secret: process.env.NEXTAUTH_SECRET,
};
