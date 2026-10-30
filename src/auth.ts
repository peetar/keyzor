import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
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
    async jwt({ token, user, account, profile }) {
      const profileAny = profile as Record<string, unknown> | undefined;
      const resolvedEmail =
        user?.email ||
        (typeof token?.email === "string" ? token.email : undefined) ||
        (typeof profileAny?.email === "string" ? profileAny.email : undefined) ||
        (typeof profileAny?.login === "string"
          ? `${profileAny.login}@users.noreply.github.com`
          : undefined) ||
        (typeof token?.sub === "string" && account?.provider === "github"
          ? `github_${token.sub}@users.noreply.github.com`
          : undefined);

      const resolvedName =
        user?.name ||
        (typeof token?.name === "string" ? token.name : undefined) ||
        (typeof profileAny?.name === "string" ? profileAny.name : undefined) ||
        (typeof profileAny?.login === "string" ? profileAny.login : undefined) ||
        "Software Architect";

      const resolvedImage =
        user?.image ||
        (typeof token?.picture === "string" ? token.picture : undefined) ||
        (typeof profileAny?.avatar_url === "string"
          ? profileAny.avatar_url
          : undefined);

      const needsSync =
        Boolean(user) ||
        !token.userId ||
        token.userId === "usr_architect_peter" ||
        !token.migratedV2;

      if (resolvedEmail && needsSync) {
        try {
          const dbUser = await getOrCreateUser({
            email: resolvedEmail,
            name: resolvedName,
            image: resolvedImage,
            provider: account?.provider || "github",
          });
          token.userId = dbUser.id;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.migratedV2 = true;
        } catch (e) {
          console.error("Error syncing user in auth jwt callback:", e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        let resolvedUserId =
          typeof token?.userId === "string" ? token.userId : "";
        const email =
          session.user.email ||
          (typeof token?.email === "string" ? token.email : "");

        if ((!resolvedUserId || resolvedUserId === "usr_architect_peter") && email) {
          try {
            const dbUser = await getOrCreateUser({
              email,
              name: session.user.name || (token?.name as string) || undefined,
              image: session.user.image || (token?.picture as string) || undefined,
              provider: "github",
            });
            resolvedUserId = dbUser.id;
          } catch (e) {
            console.error("Error syncing user in auth session callback:", e);
          }
        }

        session.user.id = resolvedUserId;
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
