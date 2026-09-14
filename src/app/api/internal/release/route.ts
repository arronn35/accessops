import { authorizeInternalRequest } from "@/lib/api/internal-auth";
import { releaseManifest } from "@/lib/release/manifest";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const auth = await authorizeInternalRequest(req);
  if (!auth.ok || auth.via === "unauthenticated_dev") return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(releaseManifest(), { headers: { "Cache-Control": "no-store" } });
}
