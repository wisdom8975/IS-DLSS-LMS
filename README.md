# IS-DLSS Professional LMS

Integrated Science Digital Learning Support System (IS-DLSS) — a role-based professional LMS for Administrator, Teacher and Student users, connected to Supabase.

## Included

- Role-based Administrator / Teacher / Student interface
- Supabase authentication
- Student course learning centre
- Four-module course structure
- Lesson and YouTube video support
- Interactive formative quizzes
- Quiz submission and progress tracking
- Teacher supervision of assigned students
- Administrator oversight and analytics
- Learner-centred African educational resources

## Deploy

This repository is a static web app. The entry point is `index.html`.

### GitHub Pages

1. Create a new GitHub repository, for example `IS-DLSS-LMS`.
2. Upload `index.html` and `README.md` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save and wait for GitHub Pages to publish the site.

### Other static hosts

The same `index.html` can be deployed to Netlify, Vercel, Cloudflare Pages, or another static hosting service.

## Supabase configuration

The app is already configured for the existing Supabase project using the browser-safe publishable key.

Do **not** put a Supabase `service_role` key or other secret credentials into this file.

After deployment, add the deployed site URL to the Supabase Authentication URL configuration, including the password-reset redirect URL required by the app.

## Important

The production database remains the source of truth for users, roles, courses, modules, enrolments, assessments and progress. Do not replace the existing Supabase project when deploying this front end.
