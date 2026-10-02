# PROOFLY — Universal Proof of Work

**Don't just say you did the work. Prove it.**

Proofly lets people create verifiable records of work completed: a specific claim, evidence,
independent verification checks, and a permanent shareable proof page at `/p/PF-XXXXXX`.

Built for the Devcenter Hacktober 2026 hackathon.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres (tables prefixed `pf_`), Auth, Storage (private `pf-evidence` bucket)
- Row Level Security on every table; all secrets server-side only

## Routes

| Route | What it is |
|---|---|
| `/` | Landing page with interactive proof example |
| `/login`, `/signup` | Auth (email/password) |
| `/dashboard` | Real stats: total / verified / in-progress proofs, views, recent proofs, notifications |
| `/proofs` | My proofs (search + filter) |
| `/proofs/new` | 3-step wizard: claim → evidence → verify & publish |
| `/proofs/[id]` | Manage a proof: edit, evidence, run verification, human verification, disputes, revoke, snapshot |
| `/p/[proofId]` | **Public proof page** — no account needed. Certificate-style, QR code, checks, timeline, share, snapshot PNG |
| `/verify` | Verification center: requests to me / my requests / notifications |
| `/collections`, `/collections/[id]` | Group proofs into collections |
| `/search` | Public search by Proof ID, title, username, category + filters |
| `/profile` | Edit profile |
| `/@username` | Public profile (rewritten to `/u/[username]`) |
| `/settings` | Change password, sign out |

## API

- `POST /api/proofs` — create draft (Proof ID minted server-side, `PF-` + 6 unambiguous chars)
- `GET/PATCH/DELETE /api/proofs/[id]` — owner detail/edit/delete
- `POST /api/proofs/[id]/verify` — **real verification engine**: URL reachability, GitHub repo/commit existence, file presence, evidence completeness, date consistency. Coverage % from decisive checks only; anything uncheckable is marked "could not independently verify", never faked.
- `POST /api/proofs/[id]/revoke` — revoke (record preserved)
- `POST /api/proofs/[id]/dispute` — public dispute filing → status DISPUTED (never hidden)
- `PATCH /api/proofs/[id]/dispute` — owner resolves disputes
- `POST /api/proofs/[id]/request-verification` — ask a user to verify
- `PATCH /api/verification-requests/[id]` — verifier: verify / reject / request changes
- `POST /api/evidence` — add URL evidence or upload a file (12 MB max, MIME allow-listed, private bucket)
- `DELETE /api/evidence/[id]`, `GET /api/evidence/[id]/file` — signed-URL file access, server-side permission checks
- `POST /api/proofs/[id]/views` — real view counting, deduped by hashed IP + day
- `GET/PATCH/DELETE /api/collections[/[id]]`, `GET/PATCH /api/profile`, `GET/PATCH /api/notifications`
- `GET /api/search` — public proof search
- `GET /api/ai/status`, `POST /api/ai/assist` — advisory AI (claim tightening, evidence analysis, gap suggestions). **Env-gated: when `AI_API_KEY` is unset, every AI button is hidden from the UI.** AI never declares work genuine.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| Key | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → `service_role` (**secret** — server only, never expose) |
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://proofly.vercel.app` (used for QR codes + share links) |
| `AI_API_KEY` | *Optional.* Any OpenAI-compatible chat-completions key. Leave unset to hide all AI features. |
| `AI_API_URL` | *Optional.* Defaults to `https://api.openai.com/v1/chat/completions` |
| `AI_MODEL` | *Optional.* Defaults to `gpt-4o-mini` |

## Deploy on Vercel (phone-friendly, no terminal)

1. Zip this folder and keep it.
2. Vercel dashboard → **Add New → Project → Upload** (or import from Git) and upload the ZIP.
3. Framework preset: **Next.js**. Build command: `npm run build`. Output: default.
4. Add the Environment Variables from the table above (all three Supabase keys at minimum).
5. **Deploy.** Open the live URL, sign up, create a proof, run verification.

## Database

The schema lives in the Supabase project already (tables `pf_*`, RLS policies, private
`pf-evidence` storage bucket, `pf_bump_views()` function). If you ever need a fresh project,
apply `supabase/schema.sql` with the SQL editor or management API, then `NOTIFY pgrst, 'reload schema';`.

## Verification honesty

- Statuses: `DRAFT → PENDING → VERIFIED / UNVERIFIED`, plus `DISPUTED` and `REVOKED`.
- Automated `VERIFIED` requires **every decisive check to pass** with at least one decisive check.
- Human verifier approval also marks a proof `VERIFIED`, with the verifier's identity, action, timestamp and comment stored.
- The UI always separates **CLAIM** (user's words) / **EVIDENCE** (submitted) / **CHECK** (technically inspected) / **VERIFICATION** (confirmed).
