/**
 * Seed a fresh database with a demo workspace.
 *
 *   npm run db:seed
 *
 * Idempotent: re-running updates the existing demo user/workspace
 * rather than duplicating. Safe to run after every migration on a
 * fresh deploy so you can verify the app boots before real sign-ups.
 *
 * This does NOT create scan data — run a real scan through the UI
 * (or `npm run scan:test`) for that. It only provisions the minimum
 * rows the app expects for a signed-in session:
 *   users → workspaces → workspace_members → privacy_settings → usage_limits
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import {
  db,
  users,
  workspaces,
  workspaceMembers,
  privacySettings,
  usageLimits,
} from "../src/lib/db";
import {
  bootstrapEntitlementForEmail,
  isAdminEmail,
  TESTER_ADMIN_PLAN,
  TESTER_ADMIN_ROLE,
} from "../src/lib/entitlements";

const DEMO_EMAIL = "demo@accessops.local";
const SEED_EMAIL = process.env.SEED_EMAIL ?? DEMO_EMAIL;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[seed] DATABASE_URL is required");
    process.exit(2);
  }

  const entitlement = bootstrapEntitlementForEmail(SEED_EMAIL);

  console.log("[seed] ensuring user…");
  let [user] = await db.select().from(users).where(eq(users.email, SEED_EMAIL)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        email: SEED_EMAIL,
        name: isAdminEmail(SEED_EMAIL) ? "AccessOps Admin" : "Demo User",
        fullName: isAdminEmail(SEED_EMAIL) ? "AccessOps Admin" : "Demo User",
        emailVerified: new Date(),
      })
      .returning();
    console.log("[seed]   created user", user.id);
  } else {
    console.log("[seed]   user already exists", user.id);
  }

  let [member] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user.id))
    .limit(1);

  if (!member) {
    console.log("[seed] creating demo workspace…");
    const [ws] = await db
      .insert(workspaces)
      .values({
        ownerUserId: user.id,
        name: "Demo workspace",
        companyName: "AccessOps Demo",
        region: "eu",
        plan: entitlement.plan,
      })
      .returning();

    [member] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId: ws.id,
        userId: user.id,
        role: entitlement.role,
        status: "active",
      })
      .returning();

    await db.insert(privacySettings).values({
      workspaceId: ws.id,
      scanDataRetentionDays: 365,
      screenshotStorageEnabled: false,
      aiProcessingEnabled: false,
      regionPreference: "eu",
    });

    await db.insert(usageLimits).values({ workspaceId: ws.id, plan: entitlement.plan });
    console.log("[seed]   created workspace", ws.id);
  } else {
    console.log("[seed]   workspace already exists", member.workspaceId);
  }

  if (isAdminEmail(SEED_EMAIL)) {
    console.log("[seed] reconciling admin tester entitlement…");
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

  console.log("[seed] done. Sign in as", SEED_EMAIL, "via the magic-link flow.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] failed", err);
  process.exit(1);
});
