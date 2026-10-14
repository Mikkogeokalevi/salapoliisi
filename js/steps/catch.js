// Pulmatyyppi: catch - kerää putoavia esineita, valta pommit.
// Raahaa alustaa sivuun. Esinen maahan = huti, pommiin osuminen = huti.
// params: { catches: 12, maxMiss: 3, dropMs: 850, speed: 3.0 }
// guess = "keratty" + catches
window.Steps["catch"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var GOAL = P.catches || 12;
  var MAXMISS = P.maxMiss || 3;
  var DROPMS = P.dropMs || 620;
  var SPEED = P.speed || 3.7;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Kerää " + GOAL + " esinettä - raahaa alustaa");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.05);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var paddle, items, got, miss, done, started;

  function reset() {
    paddle = { x: W / 2 - 40, w: 80, h: 14, y: H - 34 };
    items = [];
    got = 0; miss = 0;
    done = false;
    started = false;
    status.set("Kerää " + GOAL + " esinettä - raahaa alustaa");
  }

  function spawn() {
    if (done || !g.alive()) return;
    var count = Math.random() < 0.3 ? 2 : 1; // 30% tuplaputous
    for (var k = 0; k < count; k++) {
      var isBomb = Math.random() < 0.32;
      items.push({
        x: 20 + Math.random() * (W - 40),
        y: -16 - k * 30, r: 11,
        bomb: isBomb,
        vy: (SPEED + got * 0.16) * (0.9 + Math.random() * 0.3)
      });
    }
  }

  function moveTo(clientX) {
    started = true;
    var r = cv.el.getBoundingClientRect();
    paddle.x = Math.max(0, Math.min(W - paddle.w,
      (clientX - r.left) * (W / r.width) - paddle.w / 2));
  }

  cv.el.addEventListener("pointermove", function (e) { if (e.buttons || e.pointerType === "mouse" || e.pointerType === "touch") moveTo(e.clientX); });
  cv.el.addEventListener("pointerdown", function (e) { moveTo(e.clientX); });
  cv.el.addEventListener("touchmove", function (e) { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });

  function fail(msg) {
    miss++;
    if (navigator.vibrate) navigator.vibrate(80);
    if (window.Audio) window.Audio.error();
    status.set(msg + " - huteja " + miss + "/" + MAXMISS);
    if (miss >= MAXMISS) {
      status.set("Liikaa huteja - aloitetaan alusta!");
      got = 0; miss = 0; items = [];
    }
  }

  var last = 0;
  function loop(t) {
    if (!g.alive()) return;
    var dt = Math.min(50, t - last || 16);
    last = t;
    var f = dt / 16.7;

    if (started && !done) {
      items.forEach(function (it) { it.y += it.vy * f; });
      for (var i = items.length - 1; i >= 0; i--) {
        var it = items[i];
        // saalis alustaan?
        if (it.y + it.r >= paddle.y && it.y < paddle.y + paddle.h + 10 &&
            it.x > paddle.x - it.r && it.x < paddle.x + paddle.w + it.r) {
          items.splice(i, 1);
          if (it.bomb) {
            fail("POMMI osui alustaan!");
          } else {
            got++;
            if (window.Audio) window.Audio.click();
            status.set("Kerätty: " + got + " / " + GOAL);
            if (got >= GOAL) {
              done = true;
              status.set("Keräys valmis!");
              if (window.Audio) window.Audio.success();
              submit("keratty" + GOAL);
            }
          }
          continue;
        }
        // maahan -> huti (pommit vapaakortti)
        if (it.y - it.r > H) {
          items.splice(i, 1);
          if (!it.bomb) fail("Esine putosi maahan!");
        }
      }
    }
    draw();
    g.raf(loop);
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    items.forEach(function (it) {
      ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, 7);
      if (it.bomb) {
        ctx.fillStyle = "#e56b6b"; ctx.fill();
        ctx.fillStyle = "#0c1119";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("✕", it.x, it.y);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      } else {
        ctx.fillStyle = "#e2b46a"; ctx.fill();
        ctx.fillStyle = "#8a6c3e";
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r * .45, 0, 7); ctx.fill();
      }
    });
    // alusta
    ctx.fillStyle = "#6fd597";
    ctx.beginPath();
    var rx = 8;
    ctx.roundRect ? ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, rx)
                  : ctx.rect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.fill();
    // tilanne
    ctx.fillStyle = "#e9e7e0";
    ctx.font = "bold 13px monospace";
    ctx.fillText(got + " / " + GOAL, 10, 20);
    ctx.fillStyle = "#e56b6b";
    ctx.fillText("hutia " + miss + "/" + MAXMISS, 10, 38);
    if (!started) {
      ctx.fillStyle = "rgba(233,231,224,.75)";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Raahaa alustaa aloittaaksesi", W / 2, H * 0.55);
      ctx.textAlign = "left";
    }
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  reset();
  g.every(DROPMS, spawn);
  g.raf(loop);
  return g.cleanup;
};
