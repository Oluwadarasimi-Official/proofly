// Proof ID generator: PF-XXXXXX using unambiguous characters (no 0/O/1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomProofId(): string {
  let s = "";
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  for (const b of buf) s += ALPHABET[b % ALPHABET.length];
  return `PF-${s}`;
}
