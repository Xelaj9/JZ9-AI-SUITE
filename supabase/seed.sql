-- ════════════════════════════════════════════════════════════════════
--  JZ9suite — Seed data
--  Run AFTER schema.sql, and AFTER you have signed in once with Google
--  (so your profile row exists).
-- ════════════════════════════════════════════════════════════════════

-- 1) Default app settings -------------------------------------------------
insert into public.app_settings (key, value) values
  ('appName',            '"JZ9suite"'::jsonb),
  ('maintenanceMode',    'false'::jsonb),
  ('maxUploadSizeMB',    '10'::jsonb),
  ('defaultPromptLimit', '500'::jsonb),
  ('allowedImageTypes',  '["image/jpeg","image/png","image/webp"]'::jsonb)
on conflict (key) do nothing;

-- 2) Make YOURSELF the first admin ---------------------------------------
-- Replace the email below with the Gmail you logged in with, then run.
update public.profiles
set role = 'admin'
where email = 'YOUR_EMAIL@gmail.com';
