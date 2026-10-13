// Pulmatyyppi: targets - refleksipeli. Osu N kohteeseen ennen kuin ne katoavat.
// params: { hits: 10, ttl: 1100 (ms elinaika), maxMiss: 3 }
// guess = "osumia" + hits
window.Steps["targets"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var HITS = P.hits || 10;
  var TTL = P.ttl || 1100;
  var MAXMISS = P.maxMiss || 3;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Osu " + HITS + " kohteeseen - " + MAXMISS + " hutia sallittu");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.05);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var target = null, hits = 0, miss = 0, done = false, born = 0;

  function spawn() {
    if (done) return;
    var r = 26 + Math.random() * 8;
    target = {
      x: r + 8 + Math.random() * (W - 2 * r - 16),
      y: r + 8 + Math.random() * (H - 2 * r - 16),
      r: r
    };
    born = Date.now();
    g.timeout(TTL, function () {
      if (target && !done) {
        target = null;
        miss++;
        if (window.Audio) window.Audio.error();
        status.set("Huti! " + hits + "/" + HITS + " osumaa, huteja " + miss + "/" + MAXMISS);
        if (miss >= MAXMISS) {
          status.set("Liikaa huteja - aloitetaan alusta");
          hits = 0; miss = 0;
        }
        spawn();
      }
    });
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    if (target) {
      var age = (Date.now() - born) / TTL;
      var r = target.r * (1 - age * 0.55);
      ctx.beginPath(); ctx.arc(target.x, target.y, target.r, 0, 7);
      ctx.strokeStyle = "rgba(226,180,106,.35)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(target.x, target.y, Math.max(4, r), 0, 7);
      ctx.fillStyle = "#e2b46a"; ctx.fill();
      ctx.beginPath(); ctx.arc(target.x, target.y, 4, 0, 7);
      ctx.fillStyle = "#e56b6b"; ctx.fill();
    }
  }

  function hitTest(px, py) {
    var rect = cv.el.getBoundingClientRect();
    var x = (px - rect.left) * (W / rect.width);
    var y = (py - rect.top) * (H / rect.height);
    return target && Math.hypot(x - target.x, y - target.y) <= target.r;
  }

  function tap(px, py) {
    if (done) return;
    if (hitTest(px, py)) {
      hits++;
      if (window.Audio) window.Audio.click();
      status.set("Osu! " + hits + " / " + HITS);
      target = null;
      if (hits >= HITS) {
        done = true;
        status.set("Kalibrointi valmis!");
        if (window.Audio) window.Audio.success();
        submit("osumia" + HITS);
        return;
      }
      spawn();
    } else if (target) {
      miss++;
      if (navigator.vibrate) navigator.vibrate(60);
      status.set("Huti! huteja " + miss + "/" + MAXMISS);
      if (miss >= MAXMISS) {
        status.set("Liikaa huteja - aloitetaan alusta");
        hits = 0; miss = 0;
        target = null;
        spawn();
      }
    }
  }

  cv.el.addEventListener("pointerdown", function (e) { tap(e.clientX, e.clientY); });

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  spawn();
  var last = 0;
  g.raf(function loop(t) {
    if (!g.alive()) return;
    draw();
    g.raf(loop);
  });
  return g.cleanup;
};
