-- Harden exposed RPC privileges and add covering indexes for foreign keys.
-- Functions remain callable by authenticated users because the LMS uses them for
-- role-aware access and assessment submission. Anonymous execution is removed.

revoke execute on function public.student_quiz_questions(uuid) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_teacher_of_course(uuid) from public, anon;
revoke execute on function public.submit_lesson_formative(uuid, jsonb) from public, anon;
revoke execute on function public.teacher_supervision_students(uuid) from public, anon;

grant execute on function public.student_quiz_questions(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_teacher_of_course(uuid) to authenticated;
grant execute on function public.submit_lesson_formative(uuid, jsonb) to authenticated;
grant execute on function public.teacher_supervision_students(uuid) to authenticated;

create index if not exists idx_assessment_feedback_reviewer
  on public.assessment_feedback(reviewer_id);

create index if not exists idx_discussion_posts_author
  on public.discussion_posts(author_id);

create index if not exists idx_lesson_progress_lesson
  on public.lesson_progress(lesson_id);

create index if not exists idx_student_progress_course
  on public.student_progress(course_id);

create index if not exists idx_video_resources_course
  on public.video_resources(course_id);
