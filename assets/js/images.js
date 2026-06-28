/*
 * JZ9suite — Image assets data layer (Supabase Storage + DB)
 * Depends on: supabase.js, analytics.js
 * Exposes: window.JZ9.images
 * Bucket "prompt-images" is private; files live under <user_id>/<file>.
 * Display URLs are short-lived signed URLs so users only see their own images.
 */
(function () {
  window.JZ9 = window.JZ9 || {};
  var sb = window.JZ9.sb;
  if (!sb) { console.error("[JZ9] images.js: Supabase client missing"); return; }

  var BUCKET = "prompt-images";
  var ALLOWED = ["image/jpeg", "image/png", "image/webp"];
  var MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  var SIGNED_TTL = 60 * 60;          // 1 hour

  function track(t, m) { if (window.JZ9.track) return window.JZ9.track(t, m); }
  async function uid() { var s = await sb.auth.getSession(); return s.data && s.data.session ? s.data.session.user.id : null; }
  function safeName(n) { return (n || "image").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60); }

  var I = {
    ALLOWED: ALLOWED,
    MAX_BYTES: MAX_BYTES,

    validate: function (file) {
      if (!file) return "ไม่พบไฟล์";
      if (ALLOWED.indexOf(file.type) === -1) return "รองรับเฉพาะ JPG / PNG / WEBP";
      if (file.size > MAX_BYTES) return "ไฟล์ใหญ่เกิน 10MB";
      return null;
    },

    async upload(file) {
      var err = I.validate(file);
      if (err) throw new Error(err);
      var userId = await uid();
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      var path = userId + "/" + Date.now() + "_" + safeName(file.name);
      var up = await sb.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      var row = {
        user_id: userId, filename: file.name, file_size: file.size,
        mime_type: file.type, storage_path: path
      };
      var r = await sb.from("image_assets").insert(row).select().single();
      if (r.error) {
        // best-effort cleanup of the orphaned object
        try { await sb.storage.from(BUCKET).remove([path]); } catch (e) {}
        throw r.error;
      }
      track("image_uploaded", { id: r.data.id, size: file.size });
      return r.data;
    },

    async list() {
      var r = await sb.from("image_assets").select("*").order("created_at", { ascending: false });
      if (r.error) throw r.error;
      return r.data || [];
    },

    // attach a signed display URL to each asset row
    async withUrls(rows) {
      rows = rows || [];
      for (var i = 0; i < rows.length; i++) {
        rows[i].url = await I.signedUrl(rows[i].storage_path);
      }
      return rows;
    },

    async signedUrl(path) {
      if (!path) return null;
      var r = await sb.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
      return r.data ? r.data.signedUrl : null;
    },

    async remove(id) {
      var g = await sb.from("image_assets").select("storage_path").eq("id", id).single();
      if (g.error) throw g.error;
      try { await sb.storage.from(BUCKET).remove([g.data.storage_path]); } catch (e) { /* ignore */ }
      var d = await sb.from("image_assets").delete().eq("id", id);
      if (d.error) throw d.error;
      return true;
    },

    // ── prompt <-> image links ──────────────────────────────────────────
    async attach(promptId, imageId) {
      var userId = await uid();
      var r = await sb.from("prompt_images")
        .insert({ prompt_id: promptId, image_id: imageId, user_id: userId })
        .select().single();
      if (r.error && !/duplicate/i.test(r.error.message)) throw r.error;
      return r.data;
    },

    async detach(promptId, imageId) {
      var r = await sb.from("prompt_images").delete().eq("prompt_id", promptId).eq("image_id", imageId);
      if (r.error) throw r.error;
      return true;
    },

    async listForPrompt(promptId) {
      var r = await sb.from("prompt_images")
        .select("image_id, image:image_assets(*)")
        .eq("prompt_id", promptId);
      if (r.error) throw r.error;
      var imgs = (r.data || []).map(function (x) { return x.image; }).filter(Boolean);
      return await I.withUrls(imgs);
    }
  };

  window.JZ9.images = I;
})();
