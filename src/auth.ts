import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DEFAULT_USER_ID } from "@/db";
import { getOrCreateUser } from "@/lib/services/lifecycle-service";

const providers = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      issuer: "https://github.com/login/oauth",
    })
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: "Architect Quick Login",
    credentials: {
      email: {
        label: "Email",
        type: "email",
        placeholder: "architect@keyzor.vercel.app",
      },
      role: {
        label: "Active Hat",
        type: "text",
        placeholder: "Lead Architect (CPO / Designer / Dev)",
      },
    },
    async authorize(credentials) {
      const email =
        (credentials?.email as string)?.trim() || "architect@keyzor.vercel.app";
      const name =
        (credentials?.role as string)?.trim() || "Lead Architect (CPO / Dev)";
      return {
        id: DEFAULT_USER_ID,
        email,
        name,
      };
    },
  })
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    "keyzor-dev-secret-key-change-in-production-32bytes",
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.email) {
        try {
          const dbUser = await getOrCreateUser({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account?.provider || "credentials",
          });
          token.userId = dbUser.id;
        } catch (e) {
          console.error("Error syncing user in auth jwt callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export const oauthStatus = {
  githubConfigured: Boolean(
    process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET
  ),
  googleConfigured: Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ),
};
