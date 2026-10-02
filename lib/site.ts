import QRCode from "qrcode";

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function proofPublicUrl(proofId: string): string {
  return `${siteUrl()}/p/${proofId}`;
}

export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 240, color: { dark: "#0a1120", light: "#ffffff" } });
}

export const CATEGORIES = [
  "Software",
  "Design",
  "Research",
  "Education",
  "Freelance",
  "Open Source",
  "Business",
  "Certification",
  "Competition",
  "Creative Work",
  "Other",
] as const;

export const STATUSES = ["DRAFT", "PENDING", "VERIFIED", "UNVERIFIED", "DISPUTED", "REVOKED"] as const;

export const DISPUTE_REASONS: { value: string; label: string }[] = [
  { value: "incorrect_info", label: "Incorrect information" },
  { value: "misleading_evidence", label: "Misleading evidence" },
  { value: "wrong_attribution", label: "Wrong attribution" },
  { value: "unavailable_evidence", label: "Unavailable evidence" },
  { value: "other", label: "Other" },
];
