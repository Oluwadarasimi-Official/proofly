-- PROOFLY schema (pf_ prefixed to coexist with existing apps in this shared project)
-- All timestamps timestamptz. RLS enabled on every table.
-- This is the exact schema applied to the live Supabase project.

-- ============ TABLES ============

CREATE TABLE IF NOT EXISTS public.pf_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  name text,
  avatar_url text,
  bio text,
  organization text,
  website text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id text UNIQUE NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  claim text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Other',
  start_date date,
  completion_date date,
  contribution text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','unlisted','private')),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING','VERIFIED','UNVERIFIED','DISPUTED','REVOKED')),
  coverage numeric,
  views_count integer NOT NULL DEFAULT 0,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('url','github_repo','github_commit','live_site','image','pdf','video','certificate','file')),
  source text NOT NULL,
  description text,
  file_name text,
  mime text,
  size_bytes integer,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_proof_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  check_type text NOT NULL,
  target text,
  status text NOT NULL CHECK (status IN ('passed','failed','unverifiable')),
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verifier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verifier_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','changes_requested')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.pf_verification_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.pf_verification_requests(id) ON DELETE CASCADE,
  verifier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('verify','reject','request_changes')),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('incorrect_info','misleading_evidence','wrong_attribution','unavailable_evidence','other')),
  detail text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_collection_proofs (
  collection_id uuid NOT NULL REFERENCES public.pf_collections(id) ON DELETE CASCADE,
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, proof_id)
);

CREATE TABLE IF NOT EXISTS public.pf_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pf_proof_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proof_id uuid NOT NULL REFERENCES public.pf_proofs(id) ON DELETE CASCADE,
  ip_hash text NOT NULL,
  viewed_on date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 1,
  UNIQUE (proof_id, ip_hash, viewed_on)
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS pf_proofs_owner_idx ON public.pf_proofs(owner_id);
CREATE INDEX IF NOT EXISTS pf_proofs_proof_id_idx ON public.pf_proofs(proof_id);
CREATE INDEX IF NOT EXISTS pf_proofs_status_idx ON public.pf_proofs(status);
CREATE INDEX IF NOT EXISTS pf_proofs_visibility_idx ON public.pf_proofs(visibility);
CREATE INDEX IF NOT EXISTS pf_proofs_category_idx ON public.pf_proofs(category);
CREATE INDEX IF NOT EXISTS pf_evidence_proof_idx ON public.pf_evidence(proof_id);
CREATE INDEX IF NOT EXISTS pf_events_proof_idx ON public.pf_proof_events(proof_id);
CREATE INDEX IF NOT EXISTS pf_checks_proof_idx ON public.pf_verification_checks(proof_id);
CREATE INDEX IF NOT EXISTS pf_vreq_proof_idx ON public.pf_verification_requests(proof_id);
CREATE INDEX IF NOT EXISTS pf_vreq_verifier_idx ON public.pf_verification_requests(verifier_id);
CREATE INDEX IF NOT EXISTS pf_disputes_proof_idx ON public.pf_disputes(proof_id);
CREATE INDEX IF NOT EXISTS pf_collections_owner_idx ON public.pf_collections(owner_id);
CREATE INDEX IF NOT EXISTS pf_notifications_user_idx ON public.pf_notifications(user_id);
CREATE INDEX IF NOT EXISTS pf_views_proof_idx ON public.pf_proof_views(proof_id);
CREATE INDEX IF NOT EXISTS pf_profiles_username_idx ON public.pf_profiles(username);

-- ============ STORAGE ============

INSERT INTO storage.buckets (id, name, public)
VALUES ('pf-evidence', 'pf-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- ============ HELPERS ============

CREATE OR REPLACE FUNCTION public.pf_bump_views(p_proof_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.pf_proofs SET views_count = views_count + 1 WHERE id = p_proof_id;
$$;

CREATE OR REPLACE FUNCTION public.pf_is_proof_owner(p_proof_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.pf_proofs WHERE id = p_proof_id AND owner_id = auth.uid());
$$;

-- ============ RLS ============

ALTER TABLE public.pf_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_proof_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_collection_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pf_proof_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pf_profiles_read ON public.pf_profiles;
CREATE POLICY pf_profiles_read ON public.pf_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS pf_profiles_write ON public.pf_profiles;
CREATE POLICY pf_profiles_write ON public.pf_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS pf_proofs_owner ON public.pf_proofs;
CREATE POLICY pf_proofs_owner ON public.pf_proofs FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS pf_proofs_public_read ON public.pf_proofs;
CREATE POLICY pf_proofs_public_read ON public.pf_proofs FOR SELECT USING (visibility <> 'private');

DROP POLICY IF EXISTS pf_evidence_owner ON public.pf_evidence;
CREATE POLICY pf_evidence_owner ON public.pf_evidence FOR ALL USING (public.pf_is_proof_owner(proof_id)) WITH CHECK (public.pf_is_proof_owner(proof_id));
DROP POLICY IF EXISTS pf_evidence_public_read ON public.pf_evidence;
CREATE POLICY pf_evidence_public_read ON public.pf_evidence FOR SELECT USING (
  visibility = 'public' AND EXISTS (
    SELECT 1 FROM public.pf_proofs p WHERE p.id = pf_evidence.proof_id AND p.visibility <> 'private'
  )
);

DROP POLICY IF EXISTS pf_events_read ON public.pf_proof_events;
CREATE POLICY pf_events_read ON public.pf_proof_events FOR SELECT USING (
  public.pf_is_proof_owner(proof_id) OR EXISTS (
    SELECT 1 FROM public.pf_proofs p WHERE p.id = pf_proof_events.proof_id AND p.visibility <> 'private'
  )
);

DROP POLICY IF EXISTS pf_checks_read ON public.pf_verification_checks;
CREATE POLICY pf_checks_read ON public.pf_verification_checks FOR SELECT USING (
  public.pf_is_proof_owner(proof_id) OR EXISTS (
    SELECT 1 FROM public.pf_proofs p WHERE p.id = pf_verification_checks.proof_id AND p.visibility <> 'private'
  )
);

DROP POLICY IF EXISTS pf_vreq_read ON public.pf_verification_requests;
CREATE POLICY pf_vreq_read ON public.pf_verification_requests FOR SELECT USING (
  auth.uid() = requester_id OR auth.uid() = verifier_id OR public.pf_is_proof_owner(proof_id)
);
DROP POLICY IF EXISTS pf_vreq_create ON public.pf_verification_requests;
CREATE POLICY pf_vreq_create ON public.pf_verification_requests FOR INSERT WITH CHECK (
  auth.uid() = requester_id AND public.pf_is_proof_owner(proof_id)
);
DROP POLICY IF EXISTS pf_vreq_update ON public.pf_verification_requests;
CREATE POLICY pf_vreq_update ON public.pf_verification_requests FOR UPDATE USING (
  auth.uid() = verifier_id OR public.pf_is_proof_owner(proof_id)
);

DROP POLICY IF EXISTS pf_vreq_rev_read ON public.pf_verification_reviews;
CREATE POLICY pf_vreq_rev_read ON public.pf_verification_reviews FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pf_verification_requests r
          WHERE r.id = request_id AND (r.requester_id = auth.uid() OR r.verifier_id = auth.uid()))
);
DROP POLICY IF EXISTS pf_vreq_rev_insert ON public.pf_verification_reviews;
CREATE POLICY pf_vreq_rev_insert ON public.pf_verification_reviews FOR INSERT WITH CHECK (
  auth.uid() = verifier_id AND EXISTS (
    SELECT 1 FROM public.pf_verification_requests r WHERE r.id = request_id AND r.verifier_id = auth.uid()
  )
);

DROP POLICY IF EXISTS pf_disputes_insert ON public.pf_disputes;
CREATE POLICY pf_disputes_insert ON public.pf_disputes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS pf_disputes_owner ON public.pf_disputes;
CREATE POLICY pf_disputes_owner ON public.pf_disputes FOR SELECT USING (public.pf_is_proof_owner(proof_id));
DROP POLICY IF EXISTS pf_disputes_owner_update ON public.pf_disputes;
CREATE POLICY pf_disputes_owner_update ON public.pf_disputes FOR UPDATE USING (public.pf_is_proof_owner(proof_id));

DROP POLICY IF EXISTS pf_collections_owner ON public.pf_collections;
CREATE POLICY pf_collections_owner ON public.pf_collections FOR ALL USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS pf_collections_public_read ON public.pf_collections;
CREATE POLICY pf_collections_public_read ON public.pf_collections FOR SELECT USING (visibility = 'public');

DROP POLICY IF EXISTS pf_cproofs_read ON public.pf_collection_proofs;
CREATE POLICY pf_cproofs_read ON public.pf_collection_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.pf_collections c
          WHERE c.id = collection_id AND (c.visibility = 'public' OR c.owner_id = auth.uid()))
);
DROP POLICY IF EXISTS pf_cproofs_write ON public.pf_collection_proofs;
CREATE POLICY pf_cproofs_write ON public.pf_collection_proofs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.pf_collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.pf_collections c WHERE c.id = collection_id AND c.owner_id = auth.uid())
);

DROP POLICY IF EXISTS pf_notifications_owner ON public.pf_notifications;
CREATE POLICY pf_notifications_owner ON public.pf_notifications FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS pf_views_insert ON public.pf_proof_views;
CREATE POLICY pf_views_insert ON public.pf_proof_views FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS pf_views_update ON public.pf_proof_views;
CREATE POLICY pf_views_update ON public.pf_proof_views FOR UPDATE USING (true);
DROP POLICY IF EXISTS pf_views_owner_read ON public.pf_proof_views;
CREATE POLICY pf_views_owner_read ON public.pf_proof_views FOR SELECT USING (public.pf_is_proof_owner(proof_id));

DROP POLICY IF EXISTS "pf-evidence owner read" ON storage.objects;
CREATE POLICY "pf-evidence owner read" ON storage.objects FOR SELECT USING (
  bucket_id = 'pf-evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "pf-evidence owner insert" ON storage.objects;
CREATE POLICY "pf-evidence owner insert" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'pf-evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "pf-evidence owner delete" ON storage.objects;
CREATE POLICY "pf-evidence owner delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'pf-evidence' AND auth.uid()::text = (storage.foldername(name))[1]
);

NOTIFY pgrst, 'reload schema';
