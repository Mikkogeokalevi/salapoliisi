// Pulmatyyppi: runner - tap-hyppy esteiden yli, selviydy X sekuntia
// params: { duration: 30 } (sekuntia), nopeus kasvaa
// guess = "pako" + duration
window.Steps["runner"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var DURATION = P.duration || 30;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Selviydy " + DURATION + " sekuntia - kosketa hypataksesi");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 0.55);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var GROUND = H - 30;
  var player, obstacles, elapsed, speed, running, dead, started;

  function reset() {
    player = { x: 40, y: GROUND, vy: 0, size: 22 };
    obstacles = [];
    elapsed = 0;
    speed = 3.2;
    running = true;
    dead = false;
    started = false;
    lastSpawn = -2000;
  }

  function jump() {
    if (!started) started = true;
    if (dead) { reset(); return; }
    if (player.y >= GROUND) {
      player.vy = -H * 0.045;
      if (window.Audio) window.Audio.click();
    }
  }

  cv.el.addEventListener("pointerdown", jump);
  cv.el.addEventListener("touchstart", function (e) { e.preventDefault(); jump(); }, { passive: false });

  var lastSpawn = -2000, lastT = 0;

  function tick(dt) {
    if (dead || !running) return;
    if (started) elapsed += dt / 1000;
    speed = 3.2 + elapsed * 0.06;

    // pelaaja
    player.vy += 0.0022 * dt;
    player.y += player.vy * dt * 0.06;
    if (player.y > GROUND) { player.y = GROUND; player.vy = 0; }

    // esteet (spawn)
    if (elapsed * 1000 - lastSpawn > Math.max(700, 1600 - elapsed * 20)) {
      var hgt = 20 + Math.random() * 30;
      obstacles.push({ x: W + 10, w: 14 + Math.random() * 18, h: hgt });
      lastSpawn = elapsed * 1000;
    }

    obstacles.forEach(function (o) { o.x -= speed * dt * 0.06; });
    obstacles = obstacles.filter(function (o) { return o.x + o.w > -10; });

    // tormays: pelaajan alareuna (player.y) jaa esteen huippua korkeammalle
    for (var i = 0; i < obstacles.length; i++) {
      var o = obstacles[i];
      if (player.x + player.size > o.x && player.x < o.x + o.w &&
          player.y > GROUND - o.h + 2) {
        dead = true;
        running = false;
        if (navigator.vibrate) navigator.vibrate(150);
        if (window.Audio) window.Audio.error();
        status.set("OSUIT - " + elapsed.toFixed(1) + " s. Kosketa aloittaaksesi uudelleen.");
        return;
      }
    }

    // tavoite
    if (elapsed >= DURATION) {
      running = false;
      status.set("Pako onnistui - " + DURATION + " s!");
      submit("pako" + DURATION);
    }
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    // maa
    ctx.strokeStyle = "#26324a";
    ctx.beginPath(); ctx.moveTo(0, GROUND + 1); ctx.lineTo(W, GROUND + 1); ctx.stroke();
    // pelaaja
    ctx.fillStyle = "#6fd597";
    ctx.fillRect(player.x, player.y - player.size, player.size, player.size);
    // esteet
    ctx.fillStyle = "#e56b6b";
    obstacles.forEach(function (o) { ctx.fillRect(o.x, GROUND - o.h, o.w, o.h); });
    // aika
    ctx.fillStyle = "#e2b46a";
    ctx.font = "bold 14px monospace";
    ctx.fillText(elapsed.toFixed(1) + "s / " + DURATION + "s", 10, 20);
    if (dead) {
      ctx.fillStyle = "rgba(229,107,107,.9)";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("OSUIT", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  }

  var last = 0;
  function loop(t) {
    if (!g.alive()) return;
    var dt = t - last || 16;
    last = t;
    tick(dt);
    draw();
    g.raf(loop);
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  reset();
  g.raf(loop);
  return g.cleanup;
};
