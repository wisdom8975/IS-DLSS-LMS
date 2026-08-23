create or replace view public.student_course_progress as
select e.student_id,c.id as course_id,c.title as course_title,count(l.id)::integer as total_lessons,count(l.id) filter (where coalesce(lp.completed,false))::integer as completed_lessons,case when count(l.id)=0 then 0::numeric else round((count(l.id) filter (where coalesce(lp.completed,false)))::numeric*100/count(l.id),2) end as progress_percent,max(lp.completed_at) as last_completed_at
from public.course_enrolments e join public.courses c on c.id=e.course_id left join public.modules m on m.course_id=c.id left join public.lessons l on l.module_id=m.id left join public.lesson_progress lp on lp.lesson_id=l.id and lp.student_id=e.student_id where e.active=true group by e.student_id,c.id,c.title;
create or replace view public.teacher_student_course_progress as select p.* from public.student_course_progress p join public.courses c on c.id=p.course_id where c.instructor_id=auth.uid() or public.is_admin();
create or replace view public.my_course_progress as select * from public.student_course_progress where student_id=auth.uid();
revoke all on public.student_course_progress from anon; revoke all on public.teacher_student_course_progress from anon; revoke all on public.my_course_progress from anon;
grant select on public.student_course_progress,public.teacher_student_course_progress,public.my_course_progress to authenticated;
