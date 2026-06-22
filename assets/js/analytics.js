/*
 * JZ9suite — lightweight usage tracking
 * Exposes window.JZ9.track(eventType, metadata?)
 * Events: user_login | prompt_created | prompt_updated | prompt_deleted |
 *         image_uploaded | prompt_copied | prompt_favorited
 * Fails silently — tracking must never break the UX.
 */
(function () {
  window.JZ9 = window.JZ9 || {};
  var sb = window.JZ9.sb;

  window.JZ9.track = async function (eventType, metadata) {
    try {
      if (!sb) return;
      var s = await sb.auth.getSession();
      var session = s.data ? s.data.session : null;
      if (!session) return;
      await sb.from("usage_events").insert({
        user_id: session.user.id,
        event_type: eventType,
        metadata: metadata || {}
      });
    } catch (e) {
      console.debug("[JZ9] track skipped:", e && e.message);
    }
  };
})();
