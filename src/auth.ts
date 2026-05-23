/**
 * Auth.js v5 configuration.
 *
 * Magic-link email is the primary sign-in method. GitHub OAuth is
 * optional and only registered if AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
 * are set, so a clean checkout still boots.
 *
 * On first sign-in we provision the user's default workspace +
 * privacy_settings + usage_limits in a single transaction. This is the
 * "workspace bootstrap" step from the brief.
 */
import NextAuth, { type DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import Resend from "next-auth/providers/resend";
import GitHub from "next-auth/providers/github";
import { db } from "@/lib/db";
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  workspaces,
  workspaceMembers,
  privacySettings,
  usageLimits,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  bootstrapEntitlementForEmail,
  isAdminEmail,
  TESTER_ADMIN_PLAN,
  TESTER_ADMIN_ROLE,
} from "@/lib/entitlements";

// Augment the Session type with our workspace context.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId: string | null;
    } & DefaultSession["user"];
  }
}

const githubEnabled = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const resendEnabled = !!process.env.RESEND_API_KEY;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/auth/sign-in",
    verifyRequest: "/auth/verify-request",
  },
  providers: [
    ...(resendEnabled
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.AUTH_EMAIL_FROM ?? "AccessOps AI <noreply@example.com>",
            maxAge: 15 * 60,
          }),
        ]
      : []),
    ...(githubEnabled
      ? [
          GitHub({
            clientId: process.env.AUTH_GITHUB_ID!,
            clientSecret: process.env.AUTH_GITHUB_SECRET!,
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach the user's primary workspace id to the session.
      // (One workspace per user in MVP; multi-workspace switching uses
      // a `currentWorkspaceId` cookie that overrides this.)
      const [member] = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, user.id))
        .limit(1);

      session.user.id = user.id;
      session.user.workspaceId = member?.workspaceId ?? null;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await bootstrapWorkspaceForUser(user.id, user.email ?? null);
    },
    async signIn({ user }) {
      if (!user.id) return;
      await bootstrapWorkspaceForUser(user.id, user.email ?? null);
      await reconcileAdminWorkspaceForUser(user.id, user.email ?? null);
    },
  },
});

/**
 * Create a default workspace + privacy_settings + usage_limits +
 * owner workspace_members row. Idempotent: safe to re-run.
 */
export async function bootstrapWorkspaceForUser(
  userId: string,
  email: string | null
) {
  const entitlement = bootstrapEntitlementForEmail(email);
  const existing = await db
    .select({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);
  if (existing.length > 0) {
    await reconcileAdminWorkspaceForUser(userId, email);
    return;
  }

  const inferredName = email?.split("@")[0] ?? "My workspace";

  const [ws] = await db
    .insert(workspaces)
    .values({
      ownerUserId: userId,
      name: `${inferredName}'s workspace`,
      region: "eu",
      plan: entitlement.plan,
    })
    .returning({ id: workspaces.id });

  await db.insert(workspaceMembers).values({
    workspaceId: ws.id,
    userId,
    role: entitlement.role,
    status: "active",
  });

  await db.insert(privacySettings).values({
    workspaceId: ws.id,
    scanDataRetentionDays: 365,
    screenshotStorageEnabled: false,
    aiProcessingEnabled: false,
    regionPreference: "eu",
  });

  await db.insert(usageLimits).values({
    workspaceId: ws.id,
    plan: entitlement.plan,
  });
}

export async function reconcileAdminWorkspaceForUser(
  userId: string,
  email: string | null
) {
  if (!isAdminEmail(email)) return;

  const [member] = await db
    .select({ id: workspaceMembers.id, workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);
  if (!member) return;

  await db
    .update(workspaceMembers)
    .set({ role: TESTER_ADMIN_ROLE, status: "active" })
    .where(eq(workspaceMembers.id, member.id));

  await db
    .update(workspaces)
    .set({ plan: TESTER_ADMIN_PLAN })
    .where(eq(workspaces.id, member.workspaceId));

  const [limits] = await db
    .select({ id: usageLimits.id })
    .from(usageLimits)
    .where(eq(usageLimits.workspaceId, member.workspaceId))
    .limit(1);

  if (limits) {
    await db
      .update(usageLimits)
      .set({ plan: TESTER_ADMIN_PLAN })
      .where(eq(usageLimits.workspaceId, member.workspaceId));
  } else {
    await db.insert(usageLimits).values({
      workspaceId: member.workspaceId,
      plan: TESTER_ADMIN_PLAN,
    });
  }
}
