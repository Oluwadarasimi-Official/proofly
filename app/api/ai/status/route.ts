import { json } from "@/lib/api";
import { aiEnabled } from "@/lib/ai";

// GET /api/ai/status — lets the client hide every AI control when no key is set.
export async function GET() {
  return json({ enabled: aiEnabled() });
}
