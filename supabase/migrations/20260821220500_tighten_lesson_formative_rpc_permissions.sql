revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.is_teacher_of_course(uuid) from public, anon;
grant execute on function public.is_teacher_of_course(uuid) to authenticated;
revoke all on function public.submit_lesson_formative(uuid,jsonb) from public, anon;
grant execute on function public.submit_lesson_formative(uuid,jsonb) to authenticated;
