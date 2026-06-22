/*
 * JZ9suite — Auth & route guards
 * Depends on: supabase.js (window.JZ9.sb), config.js (window.JZ9_CONFIG)
 * Exposes: window.JZ9.auth
 */
(function () {
  window.JZ9 = window.JZ9 || {};
  var sb = window.JZ9.sb;
  var cfg = window.JZ9_CONFIG || {};
  if (!sb) { console.error("[JZ9] auth.js: Supabase client missing"); return; }

  var _profile = null; // cached profile row for this page load

  async function signInWithGoogle() {
    var redirectTo = window.location.origin + (cfg.POST_LOGIN_REDIRECT || "/app/dashboard.html");
    var res = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo }
    });
    if (res.error) { console.error("[JZ9] signIn error", res.error); alert("เข้าสู่ระบบไม่สำเร็จ: " + res.error.message); }
    return res;
  }

  async function signOut() {
    await sb.auth.signOut();
    _profile = null;
    window.location.href = cfg.LOGIN_PAGE || "/login.html";
  }

  async function getSession() {
    var r = await sb.auth.getSession();
    return r.data ? r.data.session : null;
  }

  async function getProfile(force) {
    if (_profile && !force) return _profile;
    var session = await getSession();
    if (!session) return null;
    var r = await sb.from("profiles").select("*").eq("id", session.user.id).single();
    if (r.error) { console.warn("[JZ9] getProfile", r.error.message); return null; }
    _profile = r.data;
    return _profile;
  }

  // Record a login: update last_login_at + emit a user_login event.
  // Safe to call on every dashboard load; throttled to once per session token.
  async function recordLogin() {
    var session = await getSession();
    if (!session) return;
    var key = "jz9_login_logged_" + session.user.id;
    try { if (sessionStorage.getItem(key)) return; } catch (e) {}
    await sb.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", session.user.id);
    if (window.JZ9.track) await window.JZ9.track("user_login");
    try { sessionStorage.setItem(key, "1"); } catch (e) {}
  }

  // Guard: redirect to login if there is no session. Returns the profile.
  async function requireAuth() {
    var session = await getSession();
    if (!session) { window.location.replace(cfg.LOGIN_PAGE || "/login.html"); return null; }
    var profile = await getProfile();
    if (profile && profile.is_disabled) {
      await signOut();
      alert("บัญชีนี้ถูกปิดการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      return null;
    }
    return profile;
  }

  // Guard: must be admin, else bounce to user dashboard.
  async function requireAdmin() {
    var profile = await requireAuth();
    if (!profile) return null;
    if (profile.role !== "admin") {
      window.location.replace(cfg.POST_LOGIN_REDIRECT || "/app/dashboard.html");
      return null;
    }
    return profile;
  }

  window.JZ9.auth = {
    signInWithGoogle: signInWithGoogle,
    signOut: signOut,
    getSession: getSession,
    getProfile: getProfile,
    recordLogin: recordLogin,
    requireAuth: requireAuth,
    requireAdmin: requireAdmin
  };
})();
