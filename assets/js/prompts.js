/*
 * JZ9suite — Prompt Library data layer
 * Depends on: supabase.js (window.JZ9.sb), analytics.js (window.JZ9.track)
 * Exposes: window.JZ9.prompts and window.JZ9.USE_CASES
 * All queries are automatically scoped to the current user by Row Level Security.
 */
(function () {
  window.JZ9 = window.JZ9 || {};
  var sb = window.JZ9.sb;
  if (!sb) { console.error("[JZ9] prompts.js: Supabase client missing"); return; }

  // Canonical use-case options (value + Thai label) for selects/filters.
  window.JZ9.USE_CASES = [
    { v: "food_poster",     t: "โปสเตอร์อาหาร" },
    { v: "product_ad",      t: "โฆษณาสินค้า" },
    { v: "announcement",    t: "ประกาศ" },
    { v: "menu",            t: "เมนู" },
    { v: "banner",          t: "แบนเนอร์" },
    { v: "social_media",    t: "โซเชียลมีเดีย" },
    { v: "game_promotion",  t: "โปรโมชั่นเกม" },
    { v: "hiring_post",     t: "รับสมัครงาน" },
    { v: "custom",          t: "อื่นๆ" }
  ];
  window.JZ9.useCaseLabel = function (v) {
    var f = window.JZ9.USE_CASES.filter(function (x) { return x.v === v; })[0];
    return f ? f.t : (v || "—");
  };

  function track(t, m) { if (window.JZ9.track) return window.JZ9.track(t, m); }

  async function uid() {
    var s = await sb.auth.getSession();
    return s.data && s.data.session ? s.data.session.user.id : null;
  }

  // normalize a tags input ("a, b" or array) → text[]
  function normTags(tags) {
    if (Array.isArray(tags)) return tags.filter(Boolean);
    if (typeof tags === "string") return tags.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    return [];
  }

  var P = {
    // List with optional filters. opts:
    //   { search, useCase, category, tag, favorite(bool), archived(bool), sort }
    async list(opts) {
      opts = opts || {};
      var q = sb.from("prompts").select("*");
      q = q.eq("is_archived", opts.archived === true);
      if (opts.useCase) q = q.eq("use_case", opts.useCase);
      if (opts.category) q = q.eq("category", opts.category);
      if (opts.favorite) q = q.eq("is_favorite", true);
      if (opts.tag) q = q.contains("tags", [opts.tag]);
      if (opts.search) {
        var s = opts.search.replace(/[%,]/g, " ");
        q = q.or("title.ilike.%" + s + "%,description.ilike.%" + s + "%,prompt_content.ilike.%" + s + "%");
      }
      // favorites first, then most recently updated
      q = q.order("is_favorite", { ascending: false }).order("updated_at", { ascending: false });
      var r = await q;
      if (r.error) throw r.error;
      return r.data || [];
    },

    async get(id) {
      var r = await sb.from("prompts").select("*").eq("id", id).single();
      if (r.error) throw r.error;
      return r.data;
    },

    async create(data) {
      var userId = await uid();
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      var row = {
        user_id: userId,
        title: data.title || "Untitled",
        description: data.description || null,
        prompt_content: data.prompt_content || null,
        category: data.category || null,
        tags: normTags(data.tags),
        use_case: data.use_case || null,
        style_preset: data.style_preset || null,
        canvas_size: data.canvas_size || null,
        tone_color: data.tone_color || null,
        reference_note: data.reference_note || null,
        is_favorite: !!data.is_favorite
      };
      var r = await sb.from("prompts").insert(row).select().single();
      if (r.error) throw r.error;
      track("prompt_created", { id: r.data.id, use_case: r.data.use_case });
      return r.data;
    },

    async update(id, data) {
      var patch = {};
      ["title","description","prompt_content","category","use_case","style_preset","canvas_size","tone_color","reference_note","is_favorite","is_archived"]
        .forEach(function (k) { if (k in data) patch[k] = data[k]; });
      if ("tags" in data) patch.tags = normTags(data.tags);
      var r = await sb.from("prompts").update(patch).eq("id", id).select().single();
      if (r.error) throw r.error;
      track("prompt_updated", { id: id });
      return r.data;
    },

    async remove(id) {
      var r = await sb.from("prompts").delete().eq("id", id);
      if (r.error) throw r.error;
      track("prompt_deleted", { id: id });
      return true;
    },

    async duplicate(id) {
      var src = await P.get(id);
      var copy = {
        title: (src.title || "Untitled") + " (สำเนา)",
        description: src.description, prompt_content: src.prompt_content,
        category: src.category, tags: src.tags, use_case: src.use_case,
        style_preset: src.style_preset, canvas_size: src.canvas_size,
        tone_color: src.tone_color, reference_note: src.reference_note,
        is_favorite: false
      };
      return await P.create(copy);
    },

    async toggleFavorite(id, val) {
      var r = await sb.from("prompts").update({ is_favorite: !!val }).eq("id", id).select().single();
      if (r.error) throw r.error;
      if (val) track("prompt_favorited", { id: id });
      return r.data;
    },

    async toggleArchive(id, val) {
      return await P.update(id, { is_archived: !!val });
    },

    // record a copy-to-clipboard event (the actual clipboard write is done in the UI)
    async trackCopy(id) { track("prompt_copied", { id: id }); }
  };

  window.JZ9.prompts = P;
})();
