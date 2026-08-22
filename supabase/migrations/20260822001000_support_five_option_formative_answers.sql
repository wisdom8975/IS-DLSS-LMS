-- Allow A-E answer labels if a lesson uses five answer choices.
create or replace function public.submit_lesson_formative(p_lesson_id uuid,p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_module_id uuid;
  v_course_id uuid;
  v_score numeric := 0;
  v_max numeric := 0;
  q record;
  selected text;
  selected_norm text;
  correct_norm text;
  option_value text;
  v_attempt_id uuid;
  v_completed_at timestamptz;
  v_count integer := 0;
  v_option_index integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select l.module_id,m.course_id into v_module_id,v_course_id from public.lessons l join public.modules m on m.id=l.module_id where l.id=p_lesson_id;
  if v_module_id is null then raise exception 'Lesson not found'; end if;
  if not exists(select 1 from public.course_enrolments ce where ce.course_id=v_course_id and ce.student_id=auth.uid() and ce.active) then raise exception 'Student is not enrolled in this course'; end if;

  for q in select qq.id,qq.correct_answer,qq.options,qq.points from public.quiz_questions qq where qq.lesson_id=p_lesson_id order by qq.position loop
    v_count:=v_count+1;
    v_max:=v_max+coalesce(q.points,1);
    selected:=p_answers->>q.id::text;
    selected_norm:=lower(trim(coalesce(selected,'')));
    correct_norm:=lower(trim(coalesce(q.correct_answer,'')));
    if selected_norm<>'' then
      if selected_norm=correct_norm then
        v_score:=v_score+coalesce(q.points,1);
      elsif selected_norm~'^[a-e]$' then
        v_option_index:=ascii(upper(selected_norm))-65;
        if jsonb_typeof(q.options)='array' then option_value:=q.options->>v_option_index;
        elsif jsonb_typeof(q.options)='object' then option_value:=q.options->>upper(selected_norm);
        end if;
        if lower(trim(coalesce(option_value,'')))=correct_norm then v_score:=v_score+coalesce(q.points,1); end if;
      end if;
    end if;
  end loop;
  if v_count<>20 then raise exception 'This lesson does not have exactly 20 assessment questions configured'; end if;

  insert into public.lesson_formative_attempts(lesson_id,student_id,answers,score,max_score,completed_at,updated_at)
  values(p_lesson_id,auth.uid(),coalesce(p_answers,'{}'::jsonb),v_score,v_max,now(),now())
  on conflict(student_id,lesson_id) do update set answers=excluded.answers,score=excluded.score,max_score=excluded.max_score,completed_at=excluded.completed_at,updated_at=now();

  select lfa.id,lfa.completed_at into v_attempt_id,v_completed_at from public.lesson_formative_attempts lfa where lfa.lesson_id=p_lesson_id and lfa.student_id=auth.uid();
  return jsonb_build_object('attempt_id',v_attempt_id,'score',v_score,'max_score',v_max,'completed_at',v_completed_at);
end;
$$;
revoke all on function public.submit_lesson_formative(uuid,jsonb) from public,anon;
grant execute on function public.submit_lesson_formative(uuid,jsonb) to authenticated;
