# IS-DLSS LMS v14 — Security & QA Notes

## Completed
- Supabase RLS verified for `assessment_feedback`, `notifications`, `student_progress`, `lesson_progress`, and `quiz_attempts`.
- `lesson_progress` now permits authenticated students to read/create/update only their own progress.
- `quiz_attempts` now permits students to create only their own attempts and read only their own attempts, while Teachers can read attempts for their assigned courses and Administrators can read permitted attempts.
- Server-authoritative quiz scoring remains enabled.
- Client submission IDs remain protected by the database uniqueness constraint.
- Offline/PWA functionality retained from v13.

## Front-end checks
- HTML parses successfully.
- The earlier raw `<div>` count discrepancy is caused by HTML strings embedded inside JavaScript templates; after excluding script/style contents, actual markup has balanced div tags.
- JavaScript syntax and service-worker syntax checks passed in the previous QA cycle.

## Final RLS hardening pass — 2026-08-20

- Quiz attempt INSERT policy now requires a Student profile and an existing Active/Published module/course.
- Lesson progress INSERT/UPDATE requires a Student profile and an existing lesson.
- Student progress INSERT/UPDATE requires a Student profile and an existing course.
- Notification INSERT now requires an Administrator or the Teacher assigned to the attempt's course; arbitrary teachers can no longer create notifications for other teachers' learners.
