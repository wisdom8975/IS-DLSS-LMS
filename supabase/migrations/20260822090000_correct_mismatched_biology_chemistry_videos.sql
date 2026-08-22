-- Correct lesson videos that were demonstrably mismatched to their lesson objectives.

update public.lessons
set video_url='https://www.youtube.com/watch?v=nXeBRwaN2Yg', updated_at=now()
where id='b1051d55-6c3c-48bf-966f-b3b5679687c7';

update public.lessons
set video_url='https://www.youtube.com/watch?v=rNjPI84sApQ', updated_at=now()
where id='78ab6dcb-4924-4f8f-b65a-86a5d17fb588';

update public.lessons
set video_url='https://www.youtube.com/watch?v=fSEFXl2XQpc', updated_at=now()
where id='f1132385-be82-46d1-9575-b688a557d5a3';

update public.lessons
set video_url='https://www.youtube.com/watch?v=1_HoWz5Kxfk', updated_at=now()
where id='91291f41-36a9-41f4-8746-f61e66113135';

update public.lessons
set video_url='https://www.youtube.com/watch?v=SxmiAYI5zO8', updated_at=now()
where id='6880c035-a964-4608-a2bd-a7fbdc974753';
