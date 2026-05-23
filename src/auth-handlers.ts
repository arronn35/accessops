/**
 * Re-export Auth.js handlers as Next.js route exports.
 * Kept separate from `src/auth.ts` so server actions in the
 * rest of the app can `import { auth }` without dragging the
 * route-handler module into client bundles.
 */
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
