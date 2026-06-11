import { z } from "zod";
import { apiError, ApiError, requireSession } from "@/lib/api/context";
import { audit, getWorkspaceContext } from "@/lib/data/firestore";
import { firestore } from "@/lib/firebase/admin";

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  fullName: z.string().trim().max(160).optional(),
});

export async function PATCH(req: Request) {
  try {
    const ctx = await requireSession();
    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new ApiError(400, "invalid_input");
    await firestore().collection("users").doc(ctx.userId).set(
      {
        name: parsed.data.name,
        fullName: parsed.data.fullName || null,
        updatedAt: new Date(),
      },
      { merge: true }
    );
    await audit({
      userId: ctx.userId,
      workspaceId: ctx.workspaceId,
      action: "profile.updated",
      resourceType: "user",
      resourceId: ctx.userId,
    });
    const current = await getWorkspaceContext(ctx.userId);
    return Response.json({ user: current?.user ?? null });
  } catch (err) {
    return apiError(err);
  }
}
