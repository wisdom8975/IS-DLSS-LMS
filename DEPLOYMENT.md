# IS-DLSS Deployment Checklist

## 1. Create repository

Create a GitHub repository and upload the contents of this folder to the repository root.

## 2. Publish

Use GitHub Pages or another static host. The main file must remain named `index.html`.

## 3. Configure Supabase Auth

After you know the public site URL, add it to the Supabase Authentication URL configuration.

Use the exact deployed URL as the Site URL and add any password-reset callback URL used by the LMS to the allowed Redirect URLs.

## 4. Test accounts

Test one account for each role:

- Administrator
- Teacher
- Student

Then verify:

- Student sees only enrolled courses.
- Teacher sees only students assigned through their course enrolments.
- Administrator can oversee all users and courses.
- Password recovery returns to the deployed LMS.
- Quiz submission records assessment evidence and progress.
