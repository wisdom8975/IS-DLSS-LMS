-- IS-DLSS LMS Phase 1 security/performance hardening
-- Safe additive change: cover the intervention_updates.author_id foreign key.
-- Applied to production as migration 20260823004441_phase1_security_performance_hardening.

create index if not exists idx_intervention_updates_author
  on public.intervention_updates(author_id);
