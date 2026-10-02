"use client";

import { useRef, useState } from "react";
import { btnGhost } from "./ui";

/**
 * Shareable proof snapshot card. Renders a 1200x630 SVG and converts it to
 * PNG client-side via canvas for download (LinkedIn / X / portfolio / CV).
 */
export default function SnapshotCard({
  proofId,
  title,
  creator,
  verifiedAt,
  evidenceCount,
  qrDataUrl,
  publicUrl,
}: {
  proofId: string;
  title: string;
  creator: string;
  verifiedAt: string;
  evidenceCount: number;
  qrDataUrl: string;
  publicUrl: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadPng() {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(true);
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 1200, 630);
      URL.revokeObjectURL(url);
      const png = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!png) throw new Error("render failed");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(png);
      a.download = `proofly-${proofId}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      alert("Could not render the PNG. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const shortTitle = title.length > 64 ? title.slice(0, 64) + "…" : title;

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <svg ref={svgRef} viewBox="0 0 1200 630" width="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0a1120" />
              <stop offset="1" stopColor="#050914" />
            </linearGradient>
            <linearGradient id="acc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#0ea5e9" />
            </linearGradient>
          </defs>
          <rect width="1200" height="630" fill="url(#bg)" />
          <rect x="0" y="0" width="1200" height="10" fill="url(#acc)" />
          <circle cx="1050" cy="120" r="220" fill="#22d3ee" opacity="0.05" />
          <circle cx="120" cy="560" r="160" fill="#0ea5e9" opacity="0.06" />

          <text x="80" y="110" fontFamily="Arial, sans-serif" fontSize="34" fontWeight="bold" letterSpacing="6" fill="#ffffff">
            PROOF<tspan fill="#22d3ee">LY</tspan>
          </text>
          <text x="80" y="148" fontFamily="Arial, sans-serif" fontSize="20" letterSpacing="4" fill="#34d399">
            ✓ VERIFIED PROOF OF WORK
          </text>

          <text x="80" y="250" fontFamily="Arial, sans-serif" fontSize="52" fontWeight="bold" fill="#ffffff">
            {shortTitle}
          </text>
          <text x="80" y="310" fontFamily="monospace" fontSize="30" letterSpacing="3" fill="#22d3ee">
            {proofId}
          </text>

          <text x="80" y="400" fontFamily="Arial, sans-serif" fontSize="26" fill="#94a3b8">
            Creator: <tspan fill="#ffffff" fontWeight="bold">{creator}</tspan>
          </text>
          <text x="80" y="450" fontFamily="Arial, sans-serif" fontSize="26" fill="#94a3b8">
            Verified: <tspan fill="#ffffff">{verifiedAt}</tspan>
          </text>
          <text x="80" y="500" fontFamily="Arial, sans-serif" fontSize="26" fill="#94a3b8">
            Evidence items: <tspan fill="#ffffff">{evidenceCount}</tspan>
          </text>
          <text x="80" y="560" fontFamily="monospace" fontSize="20" fill="#64748b">
            {publicUrl}
          </text>

          <rect x="920" y="330" width="200" height="200" rx="16" fill="#ffffff" />
          <image href={qrDataUrl} x="930" y="340" width="180" height="180" />
          <text x="1020" y="560" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="18" fill="#64748b">
            Scan to verify
          </text>
        </svg>
      </div>
      <button onClick={downloadPng} disabled={busy} className={`${btnGhost} mt-4 w-full sm:w-auto`}>
        {busy ? "Rendering…" : "Download snapshot PNG"}
      </button>
    </div>
  );
}
