import { headers } from "next/headers";
import { siteUrl } from "./site";

/**
 * Origin of the current request (protocol + host), falling back to the
 * configured site URL when not in a request context.
 * SERVER ONLY — never import into client components.
 */
export async function requestOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host =
      h.get("x-forwarded-host")?.split(",")[0]?.trim() || h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
      return `${proto}://${host}`;
    }
  } catch {
    /* not in a request context */
  }
  return siteUrl();
}

/** Public proof URL rooted at the current request's origin. SERVER ONLY. */
export async function requestProofUrl(proofId: string): Promise<string> {
  return `${await requestOrigin()}/p/${proofId}`;
}
