-- Lesson-level formative assessment persistence and secure server-side marking.
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='Administrator' and active); $$;
create or replace function public.is_teacher_of_course(p_course_id uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles p join public.courses c on c.instructor_id=p.id where p.id=auth.uid() and p.role='Teacher' and p.active and c.id=p_course_id); $$;

create table if not exists public.lesson_formative_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score numeric(10,2) not null default 0,
  max_score numeric(10,2) not null default 0,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, lesson_id)
);
create index if not exists idx_lesson_formative_student on public.lesson_formative_attempts(student_id, completed_at desc);
create index if not exists idx_lesson_formative_lesson on public.lesson_formative_attempts(lesson_id);
drop trigger if exists trg_lesson_formative_updated on public.lesson_formative_attempts;
create trigger trg_lesson_formative_updated before update on public.lesson_formative_attempts for each row execute function public.set_updated_at();

alter table public.lesson_formative_attempts enable row level security;
drop policy if exists lesson_formative_student_read on public.lesson_formative_attempts;
create policy lesson_formative_student_read on public.lesson_formative_attempts for select to authenticated using(student_id=auth.uid() or public.is_admin() or exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.courses c on c.id=m.course_id where l.id=lesson_formative_attempts.lesson_id and c.instructor_id=auth.uid()));
drop policy if exists lesson_formative_student_write on public.lesson_formative_attempts;
create policy lesson_formative_student_write on public.lesson_formative_attempts for insert to authenticated with check(student_id=auth.uid() and exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.course_enrolments e on e.course_id=m.course_id and e.student_id=auth.uid() where l.id=lesson_formative_attempts.lesson_id));
drop policy if exists lesson_formative_student_update on public.lesson_formative_attempts;
create policy lesson_formative_student_update on public.lesson_formative_attempts for update to authenticated using(student_id=auth.uid()) with check(student_id=auth.uid() and exists(select 1 from public.lessons l join public.modules m on m.id=l.module_id join public.course_enrolments e on e.course_id=m.course_id and e.student_id=auth.uid() where l.id=lesson_formative_attempts.lesson_id));

drop function if exists public.submit_lesson_formative(uuid,jsonb);
create or replace function public.submit_lesson_formative(p_lesson_id uuid,p_answers jsonb)
returns table(attempt_id uuid,score numeric,max_score numeric,completed_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare
  v_module_id uuid; v_course_id uuid; v_position integer; v_start integer; v_end integer;
  v_score numeric := 0; v_max numeric := 0; q record; selected text; v_attempt_id uuid; v_completed_at timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select l.module_id,m.course_id,l.position into v_module_id,v_course_id,v_position from public.lessons l join public.modules m on m.id=l.module_id where l.id=p_lesson_id;
  if v_module_id is null then raise exception 'Lesson not found'; end if;
  if not exists(select 1 from public.course_enrolments where course_id=v_course_id and student_id=auth.uid() and active) then raise exception 'Student is not enrolled in this course'; end if;
  v_start := ((v_position-1)*5)+1; v_end := v_position*5;
  for q in select id,correct_answer,points from public.quiz_questions where module_id=v_module_id and position between v_start and v_end order by position loop
    v_max := v_max + q.points; selected := p_answers->>q.id::text;
    if selected is not null and upper(selected)=upper(q.correct_answer) then v_score := v_score + q.points; end if;
  end loop;
  insert into public.lesson_formative_attempts(lesson_id,student_id,answers,score,max_score,completed_at,updated_at)
  values(p_lesson_id,auth.uid(),coalesce(p_answers,'{}'::jsonb),v_score,v_max,now(),now())
  on conflict(student_id,lesson_id) do update set answers=excluded.answers,score=excluded.score,max_score=excluded.max_score,completed_at=excluded.completed_at,updated_at=now()
  returning lesson_formative_attempts.id,lesson_formative_attempts.completed_at into v_attempt_id,v_completed_at;
  return query select v_attempt_id,v_score,v_max,v_completed_at;
end;
$$;
revoke all on function public.submit_lesson_formative(uuid,jsonb) from public, anon;
grant execute on function public.submit_lesson_formative(uuid,jsonb) to authenticated;

update public.lessons
set content = left(content, position('𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧' in content)-1) || E'\n' || substring(content from position('𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞' in content))
where content like '%𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗩𝗘 𝗔𝗦𝗦𝗘𝗦𝗦𝗠𝗘𝗡𝗧%' and content like '%𝗦𝗧𝗨𝗗𝗬 𝗖𝗛𝗘𝗖𝗞%';
