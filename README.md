# JZ9suite

AI creative toolkit + multi-user Prompt Library.

**Studio tools** (existing, OpenAI-powered):
- 🧬 Visual DNA Extractor (GPT-4o Vision)
- ⌨️ Prompt Editor (GPT-4o-mini)
- 🎨 Graphic Engine (GPT-4o + GPT-Image-1)
- 📐 Smart Resize Prompt
- 🧠 Universal Graphic Prompt Builder

**SaaS platform** (multi-user, in progress):
- Google/Gmail login, per-user Prompt Library, image attachments, admin dashboard.

---

## Architecture

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, multi-page, no build step |
| AI proxy | Vercel serverless `api/proxy.js` → OpenAI |
| Auth / DB / Storage | **Supabase** (Postgres + Auth + Storage + Row Level Security) |
| Hosting | Vercel (static + serverless) |

The Supabase **anon key** is loaded client-side and is safe to expose — all
data access is guarded by Row Level Security. Secrets (`OPENAI_API_KEY`,
Supabase `service_role`) stay server-side only.

## Files

```
index.html              Studio (5 AI tools) — unchanged
landing.html            JZ9suite landing page            (coming next)
login.html              Google sign-in
app/dashboard.html      User dashboard
app/editor.html         Prompt editor                    (coming next)
app/gallery.html        Image gallery                    (coming next)
admin/*.html            Admin backend                    (coming next)
assets/css/jz9.css      Shared design system
assets/js/config.js     Public Supabase config (you fill in)
assets/js/supabase.js   Supabase client singleton
assets/js/auth.js       Auth + route guards
assets/js/analytics.js  Usage tracking
api/proxy.js            OpenAI proxy (unchanged)
supabase/schema.sql     Tables + RLS + triggers + storage bucket
supabase/seed.sql       Default settings + first admin
```

---

## Setup — step by step

### A) Supabase project (database + auth + storage)

1. Go to <https://supabase.com> → **New project**. Pick a name + strong DB password + region. Wait ~2 min for it to provision.
2. Open **SQL Editor → New query**, paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates all tables, RLS policies, triggers, and the `prompt-images` storage bucket.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → keep secret (Vercel env only)

### B) Google OAuth (Gmail login)

4. Go to <https://console.cloud.google.com> → create/select a project.
5. **APIs & Services → OAuth consent screen** → External → fill app name/support email → save.
6. **APIs & Services → Credentials → Create credentials → OAuth client ID** → type **Web application**.
   - **Authorized redirect URI**: paste your Supabase callback —
     `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret**.
7. In Supabase → **Authentication → Providers → Google** → enable, paste Client ID + Secret → save.
8. In Supabase → **Authentication → URL Configuration** → add your site URL(s) to **Redirect URLs**, e.g.
   `https://jz9-ai-suite.vercel.app/app/dashboard.html` and `http://localhost:8799/app/dashboard.html` for local testing.

### C) Wire the keys into the app

9. Edit [`assets/js/config.js`](assets/js/config.js) → set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
10. In **Vercel → Project → Settings → Environment Variables** add (see [`.env.example`](.env.example)):
    - `OPENAI_API_KEY` (existing)
    - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (for future admin functions)

### D) Create the first admin

11. Sign in once via **`/login.html`** with your Gmail (this creates your profile row).
12. In Supabase **SQL Editor**, open [`supabase/seed.sql`](supabase/seed.sql), set `YOUR_EMAIL@gmail.com` to your email, and **Run**. You are now `admin`.

### E) Test

- Visit `/login.html` → sign in with Google → you should land on `/app/dashboard.html`.
- Admins see a **🛠 Admin** link in the dashboard nav.

---

## Build phases

- [x] **Phase 1 — Foundation**: schema + RLS + storage, Supabase client, auth + guards, login page, dashboard shell, config/env, setup guide.
- [ ] Phase 2 — Prompt Library data layer + full Dashboard + Prompt Editor (+ "Save to library" from Studio tools).
- [ ] Phase 3 — Image upload + gallery + attach to prompts.
- [ ] Phase 4 — Analytics events + Admin (`/admin`, users, prompts, settings).
- [ ] Phase 5 — Landing page + nav login/dashboard CTA + polish (loading/empty/error, responsive).

Existing Studio tools and the OpenAI proxy are untouched throughout.
