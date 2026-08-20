-- Applied to Supabase project mnypxpwcfydyqeiyigom on 2026-08-20.
-- Hosted Supabase/Postgres is authoritative; browser storage is offline cache/queue only.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, full_name, role, institution)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New User'), 'Student'::public.app_role,
    new.raw_user_meta_data ->> 'institution')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.recalculate_quiz_attempt_score() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.submit_module_quiz(uuid, uuid, text) from public, anon, authenticated;

drop policy if exists "students enrol themselves" on public.course_enrolments;
drop policy if exists "students create own lesson progress" on public.lesson_progress;
drop policy if exists "students update own lesson progress" on public.lesson_progress;
drop policy if exists "students update own progress" on public.student_progress;
drop policy if exists "students update own progress row" on public.student_progress;
drop policy if exists "students create own quiz attempts" on public.quiz_attempts;
drop policy if exists "quiz question visibility" on public.quiz_questions;

create policy "students create enrolled lesson progress" on public.lesson_progress for insert to authenticated with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.lessons l on l.id = lesson_progress.lesson_id
    join public.modules m on m.id = l.module_id
    join public.course_enrolments e on e.course_id = m.course_id and e.student_id = (select auth.uid())
    where p.id = (select auth.uid()) and p.role = 'Student'
  )
);
create policy "students update enrolled lesson progress" on public.lesson_progress for update to authenticated
using (student_id = (select auth.uid())) with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.lessons l on l.id = lesson_progress.lesson_id
    join public.modules m on m.id = l.module_id
    join public.course_enrolments e on e.course_id = m.course_id and e.student_id = (select auth.uid())
    where p.id = (select auth.uid()) and p.role = 'Student'
  )
);
create policy "students create enrolled course progress" on public.student_progress for insert to authenticated with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.course_enrolments e
      on e.student_id = p.id and e.course_id = student_progress.course_id
    where p.id = (select auth.uid()) and p.role = 'Student'
  )
);
create policy "students update enrolled course progress" on public.student_progress for update to authenticated
using (student_id = (select auth.uid())) with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.course_enrolments e
      on e.student_id = p.id and e.course_id = student_progress.course_id
    where p.id = (select auth.uid()) and p.role = 'Student'
  )
);
create policy "students create enrolled quiz attempts" on public.quiz_attempts for insert to authenticated with check (
  student_id = (select auth.uid()) and exists (
    select 1 from public.profiles p join public.modules m on m.id = quiz_attempts.module_id
    join public.courses c on c.id = m.course_id
    join public.course_enrolments e on e.course_id = c.id and e.student_id = (select auth.uid())
    where p.id = (select auth.uid()) and p.role = 'Student' and c.status in ('Active', 'Published')
  )
);
create policy "teachers and admins read quiz questions" on public.quiz_questions for select to authenticated using (
  public.is_admin() or exists (
    select 1 from public.modules m where m.id = quiz_questions.module_id and public.is_teacher_of_course(m.course_id)
  )
);

create or replace function public.student_quiz_questions(p_module_id uuid)
returns table (id uuid, question text, options jsonb, points numeric, "position" integer)
language sql stable security definer set search_path = public as $$
  select q.id, q.question, q.options, q.points, q.position
  from public.quiz_questions q join public.modules m on m.id = q.module_id
  join public.course_enrolments e on e.course_id = m.course_id and e.student_id = auth.uid()
  join public.profiles p on p.id = auth.uid()
  where q.module_id = p_module_id and p.role = 'Student'
  order by q.position;
$$;
revoke all on function public.student_quiz_questions(uuid) from public, anon;
grant execute on function public.student_quiz_questions(uuid) to authenticated;
