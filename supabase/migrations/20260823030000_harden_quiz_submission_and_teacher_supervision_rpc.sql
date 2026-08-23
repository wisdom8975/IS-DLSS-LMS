-- Harden SECURITY DEFINER RPCs without changing the LMS browser API.
-- Students must submit only for an active/published course and a module that
-- actually belongs to that course. Teacher supervision can only be requested
-- by the signed-in teacher themselves, unless the caller is an administrator.

create or replace function public.submit_module_quiz(
  p_module_id uuid,
  p_course_id uuid,
  p_answers text
)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.quiz_attempts;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'Student'
      and p.active
  ) then
    raise exception 'Active student account required';
  end if;

  if not exists (
    select 1
    from public.courses c
    where c.id = p_course_id
      and c.status in ('Active','Published')
  ) then
    raise exception 'Course is not active or published';
  end if;

  if not exists (
    select 1
    from public.modules m
    where m.id = p_module_id
      and m.course_id = p_course_id
  ) then
    raise exception 'Module does not belong to the supplied course';
  end if;

  if not exists (
    select 1
    from public.course_enrolments e
    where e.course_id = p_course_id
      and e.student_id = auth.uid()
      and e.active
  ) then
    raise exception 'Student is not actively enrolled in this course';
  end if;

  insert into public.quiz_attempts(module_id, student_id, answers)
  values (p_module_id, auth.uid(), p_answers::jsonb)
  returning * into result;

  return result;
end;
$$;

revoke all on function public.submit_module_quiz(uuid, uuid, text) from public, anon;
grant execute on function public.submit_module_quiz(uuid, uuid, text) to authenticated;

create or replace function public.teacher_supervision_students(p_teacher_id uuid)
returns table(
  student_id uuid,
  student_name text,
  student_username text,
  course_id uuid,
  course_title text,
  progress_percent numeric,
  latest_score numeric,
  latest_max_score numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.student_id,
    sp.full_name,
    sp.username,
    c.id,
    c.title,
    coalesce(prog.progress_percent, 0),
    qa.score,
    qa.max_score
  from public.course_enrolments e
  join public.courses c
    on c.id = e.course_id
   and c.instructor_id = p_teacher_id
  join public.profiles sp
    on sp.id = e.student_id
   and sp.role = 'Student'
   and sp.active
  left join public.student_progress prog
    on prog.student_id = e.student_id
   and prog.course_id = c.id
  left join lateral (
    select a.score, a.max_score
    from public.quiz_attempts a
    join public.modules mm on mm.id = a.module_id
    where a.student_id = e.student_id
      and mm.course_id = c.id
    order by a.submitted_at desc
    limit 1
  ) qa on true
  where (
    public.is_admin()
    or (
      p_teacher_id = auth.uid()
      and exists (
        select 1
        from public.profiles tp
        where tp.id = auth.uid()
          and tp.role = 'Teacher'
          and tp.active
      )
    )
  );
$$;

revoke all on function public.teacher_supervision_students(uuid) from public, anon;
grant execute on function public.teacher_supervision_students(uuid) to authenticated;

comment on function public.submit_module_quiz(uuid, uuid, text)
is 'Server-authoritative quiz submission: active students only, active/published course, matching module, active enrolment.';

comment on function public.teacher_supervision_students(uuid)
is 'Teacher supervision RPC: teachers may request only their own supervision data; administrators may request a specified teacher dataset.';
