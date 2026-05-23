import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit } from "@/lib/api/audit";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().max(160).optional(),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSession();
    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, "invalid_input", JSON.stringify(parsed.error.issues));
    }

    const [updated] = await db
      .update(users)
      .set({
        name: parsed.data.name,
        fullName: parsed.data.fullName || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.userId))
      .returning({
        id: users.id,
        name: users.name,
        fullName: users.fullName,
        email: users.email,
      });

    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "profile.updated",
      resourceType: "user",
      resourceId: ctx.userId,
    });

    return Response.json({ user: updated });
  } catch (err) {
    return apiError(err);
  }
}
