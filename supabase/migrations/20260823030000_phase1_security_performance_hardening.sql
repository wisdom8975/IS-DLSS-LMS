-- IS-DLSS LMS Phase 1 security/performance hardening
-- Safe additive change: cover the intervention_updates.author_id foreign key.
-- This addresses the Supabase performance advisor's unindexed-FK warning.

create index if not exists idx_intervention_updates_author
  on public.intervention_updates(author_id);
