-- Replace a duplicated SHS 2 Chemistry video with a dedicated titration/neutralisation practical.
update public.lessons
set video_url = 'https://www.youtube.com/watch?v=MDWVrTW0nq8'
where id = 'c995ac89-8361-4d53-9d28-22b5adcb6657';
