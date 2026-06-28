/*
 * JZ9suite — public runtime config
 * ---------------------------------
 * These two values are SAFE to expose in the browser. The Supabase
 * "anon" key only works together with Row Level Security (which we set up
 * in supabase/schema.sql), so users can never read each other's data.
 *
 * NEVER put the service_role key or OPENAI_API_KEY here — those stay
 * server-side only (Vercel env vars).
 *
 * 👉 Fill these in after you create your Supabase project:
 *    Supabase Dashboard → Project Settings → API
 */
window.JZ9_CONFIG = {
  SUPABASE_URL: "https://suoblquexfxmxbtrjnxe.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1b2JscXVleGZ4bXhidHJqbnhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MzMwMTksImV4cCI6MjA5ODIwOTAxOX0.e7rZzh8sKhLcYsCD2tEAwHFqWBGWHBbo4WkqmaiOEMc",

  // Where users land after a successful login:
  POST_LOGIN_REDIRECT: "/app/dashboard.html",
  LOGIN_PAGE: "/login.html"
};
