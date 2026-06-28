/*
 * JZ9suite — shared Digital Rain background (matches the Studio identity)
 * Self-contained: injects a fixed canvas behind page content and animates it.
 * Include once per page: <script defer src="/assets/js/rain-bg.js"></script>
 */
(function () {
  function init() {
    if (document.getElementById("jz9-rain")) return;
    // Respect reduced motion — skip animation, leave the solid dark bg.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var canvas = document.createElement("canvas");
    canvas.id = "jz9-rain";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:-1;pointer-events:none;";
    document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var glyphs = ("ABCDEFGHJKLMNPQRSTUVWXYZ0123456789@#$%&*+=<>[]{}/\\|" +
      "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ").split("");
    var FONT = 16;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cols = 0, drops = [];

    function resize() {
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#050807";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      cols = Math.ceil(window.innerWidth / FONT);
      drops = [];
      for (var i = 0; i < cols; i++) drops[i] = Math.random() * -50;
    }
    resize();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });

    var last = 0, interval = 60;
    function draw(t) {
      requestAnimationFrame(draw);
      if (t - last < interval) return;
      last = t;
      ctx.fillStyle = "rgba(5,8,7,0.16)";
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.font = FONT + 'px "Fira Code", monospace';
      ctx.textBaseline = "top";
      for (var i = 0; i < cols; i++) {
        var x = i * FONT, y = drops[i] * FONT;
        ctx.fillStyle = "rgba(184,255,0,0.38)";
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y);
        ctx.fillStyle = "rgba(122,180,0,0.10)";
        ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], x, y - FONT);
        if (y > window.innerHeight && Math.random() > 0.975) drops[i] = Math.random() * -20;
        drops[i] += 1;
      }
    }
    requestAnimationFrame(draw);
  }

  if (document.body) init();
  else document.addEventListener("DOMContentLoaded", init);
})();
