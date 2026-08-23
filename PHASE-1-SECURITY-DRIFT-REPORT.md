# Phase 1 — Production Security & Migration Drift Report

Date: 2026-08-23

## Findings

The connected Supabase production project is `vahkwyetointavhzwfef` and is ACTIVE_HEALTHY.

The production database currently reports substantially more migrations than the GitHub repository's `supabase/migrations` directory. The database migration history includes later security, policy, feedback/notification, and intervention changes that are not represented by files currently present in the repository migration tree.

This is a **migration-source-of-truth drift** and must be resolved before treating GitHub as a reproducible deployment source.

## Safety decision

Do not reset the production database and do not blindly replay the repository migrations.

First reconstruct/synchronize the missing migrations or create a verified schema baseline. Production data must be preserved.

## Security findings

- Supabase security advisor reports SECURITY DEFINER warnings for `student_quiz_questions(uuid)` and `teacher_supervision_students(uuid)`. Their current implementations contain role/ownership checks, so this is a hardening/documentation issue rather than proof of an authorization bypass.
- Leaked password protection is disabled in Supabase Auth and should be enabled before production launch.
- Supabase reports RLS init-plan performance warnings where `auth.*` calls are evaluated per row.
- Supabase reports several multiple-permissive-policy warnings that should be consolidated only after authorization regression tests.
- One unindexed foreign key existed on `intervention_updates.author_id`. It has now been covered by migration `20260823004441_phase1_security_performance_hardening` in production and mirrored on this branch.

## Next implementation order

1. Confirm the frontend's runtime Supabase project reference.
2. Reconcile GitHub migrations with the production migration history.
3. Verify the applied foreign-key index in production. **Completed.**
4. Enable leaked-password protection.
5. Regression-test Student, Teacher, and Administrator authorization.
6. Optimize RLS policies using `(select auth.uid())` where appropriate.
7. Consolidate duplicate permissive policies without changing access semantics.
8. Consolidate the two authentication gateways after verifying production traffic.
9. Add automated migration/security checks to CI.
10. Continue application UX, accessibility, performance, and feature upgrades.
