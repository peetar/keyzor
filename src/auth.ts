import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DEFAULT_USER_ID } from "@/db";

const providers = [];

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
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
        placeholder: "architect@kazor.app",
      },
      role: {
        label: "Active Hat",
        type: "text",
        placeholder: "Lead Architect (CPO / Designer / Dev)",
      },
    },
    async authorize(credentials) {
      const email =
        (credentials?.email as string)?.trim() || "architect@kazor.app";
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
  secret:
    process.env.AUTH_SECRET ||
    "kazor-dev-secret-key-change-in-production-32bytes",
  providers,
  session: {
    strategy: "jwt",
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
