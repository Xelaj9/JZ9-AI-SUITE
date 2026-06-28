/*
 * JZ9suite — Admin data layer (admin-only; enforced by RLS + requireAdmin guard)
 * Exposes window.JZ9.admin
 */
(function () {
  window.JZ9 = window.JZ9 || {};
  var sb = window.JZ9.sb;
  if (!sb) { console.error("[JZ9] admin.js: Supabase client missing"); return; }

  function iso(d) { return d.toISOString(); }
  async function cnt(table, build) {
    var q = sb.from(table).select("id", { count: "exact", head: true });
    if (build) q = build(q);
    var r = await q;
    if (r.error) throw r.error;
    return r.count || 0;
  }

  window.JZ9.admin = {
    async stats() {
      var now = new Date();
      var startToday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
      var week = iso(new Date(now.getTime() - 7 * 86400000));
      var month = iso(new Date(now.getTime() - 30 * 86400000));
      var users = await cnt("profiles");
      var today = await cnt("profiles", function (q) { return q.gte("created_at", startToday); });
      var w = await cnt("profiles", function (q) { return q.gte("created_at", week); });
      var m = await cnt("profiles", function (q) { return q.gte("created_at", month); });
      var prompts = await cnt("prompts");
      var images = await cnt("image_assets");
      return { users: users, today: today, week: w, month: m, prompts: prompts, images: images,
        avgPrompts: users ? (prompts / users) : 0 };
    },

    async recentActive(limit) {
      var r = await sb.from("profiles")
        .select("id,name,email,role,last_login_at,created_at")
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .limit(limit || 8);
      if (r.error) throw r.error;
      return r.data || [];
    },

    async eventSummary(days) {
      var since = iso(new Date(Date.now() - (days || 30) * 86400000));
      var r = await sb.from("usage_events").select("event_type").gte("created_at", since);
      if (r.error) throw r.error;
      var counts = {};
      (r.data || []).forEach(function (e) { counts[e.event_type] = (counts[e.event_type] || 0) + 1; });
      return counts;
    },

    async listUsers(search) {
      var q = sb.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) q = q.or("email.ilike.%" + search + "%,name.ilike.%" + search + "%");
      var r = await q;
      if (r.error) throw r.error;
      return r.data || [];
    },

    async getUser(id) {
      var r = await sb.from("profiles").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      return r.data;
    },

    async userCounts(id) {
      var p = await cnt("prompts", function (q) { return q.eq("user_id", id); });
      var i = await cnt("image_assets", function (q) { return q.eq("user_id", id); });
      return { prompts: p, images: i };
    },

    async setRole(id, role) {
      var r = await sb.from("profiles").update({ role: role }).eq("id", id).select().single();
      if (r.error) throw r.error;
      return r.data;
    },

    async setDisabled(id, val) {
      var r = await sb.from("profiles").update({ is_disabled: !!val }).eq("id", id).select().single();
      if (r.error) throw r.error;
      return r.data;
    },

    async listPrompts(search) {
      var q = sb.from("prompts")
        .select("id,user_id,title,use_case,updated_at,is_favorite,is_archived")
        .order("updated_at", { ascending: false }).limit(300);
      if (search) q = q.ilike("title", "%" + search + "%");
      var r = await q;
      if (r.error) throw r.error;
      return r.data || [];
    },

    async getSettings() {
      var r = await sb.from("app_settings").select("*");
      if (r.error) throw r.error;
      var o = {};
      (r.data || []).forEach(function (x) { o[x.key] = x.value; });
      return o;
    },

    async setSetting(key, value) {
      var r = await sb.from("app_settings")
        .upsert({ key: key, value: value, updated_at: new Date().toISOString() })
        .select().single();
      if (r.error) throw r.error;
      return r.data;
    }
  };
})();
