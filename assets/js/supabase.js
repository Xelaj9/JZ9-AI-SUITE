/*
 * JZ9suite — Supabase client (singleton)
 * Loads the official UMD build from CDN (no build step needed) and
 * exposes `window.JZ9.sb`. Include AFTER config.js and the CDN script:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="/assets/js/config.js"></script>
 *   <script src="/assets/js/supabase.js"></script>
 */
(function () {
  window.JZ9 = window.JZ9 || {};

  var cfg = window.JZ9_CONFIG || {};
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("[JZ9] Supabase library not loaded. Add the CDN <script> before supabase.js");
    return;
  }
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("YOUR-PROJECT") !== -1) {
    console.warn("[JZ9] config.js still has placeholder Supabase values — fill them in.");
  }

  window.JZ9.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();
