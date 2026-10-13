// Pulmatyyppi: flappy - drone-lento. Lapaise N porttia.
// params: { gates: 12, gap: 110, speed: 2.6 }
// guess = "lento" + gates
window.Steps["flappy"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var GATES = P.gates || 12;
  var GAP = P.gap || 110;
  var SPEED = P.speed || 2.6;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Lennä " + GATES + " portin läpi - kosketa noustaaksesi");

  var W = Math.min(340, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.35);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var bird, pipes, passed, dead, won, started;

  function reset() {
    bird = { x: W * 0.28, y: H / 2, vy: 0, r: 11 };
    pipes = [];
    passed = 0;
    dead = false; won = false; started = false;
    status.set("Lennä " + GATES + " portin läpi - kosketa noustaaksesi");
  }

  function flap() {
    if (dead) { reset(); return; }
    if (won) return;
    started = true;
    bird.vy = -5.4;
    if (window.Audio) window.Audio.tick();
  }

  cv.el.addEventListener("pointerdown", flap);

  function tick(dt) {
    if (!started || dead || won) return;
    var f = dt / 16.7;
    bird.vy += 0.32 * f;
    bird.y += bird.vy * f;

    // putket
    if (!pipes.length || pipes[pipes.length - 1].x < W - 150) {
      var gh = GAP + Math.random() * 30;
      var gy = 50 + Math.random() * (H - 100 - gh);
      pipes.push({ x: W + 20, gy: gy, gh: gh, scored: false });
    }
    pipes.forEach(function (p) { p.x -= SPEED * f; });
    if (pipes[0] && pipes[0].x < -40) pipes.shift();

    // maalipisteet
    pipes.forEach(function (p) {
      if (!p.scored && p.x + 30 < bird.x) {
        p.scored = true;
        passed++;
        status.set("Portteja: " + passed + " / " + GATES);
        if (window.Audio) window.Audio.click();
        if (passed >= GATES) {
          won = true;
          status.set("Lento suoritettu!");
          if (window.Audio) window.Audio.success();
          submit("lento" + GATES);
        }
      }
    });

    // tormaykset
    if (bird.y - bird.r < 0 || bird.y + bird.r > H) return die();
    for (var i = 0; i < pipes.length; i++) {
      var p = pipes[i];
      if (bird.x + bird.r > p.x && bird.x - bird.r < p.x + 30) {
        if (bird.y - bird.r < p.gy || bird.y + bird.r > p.gy + p.gh) return die();
      }
    }
  }

  function die() {
    dead = true;
    if (navigator.vibrate) navigator.vibrate(120);
    if (window.Audio) window.Audio.error();
    status.set("OSUIT! " + passed + "/" + GATES + " - kosketa yrittääksesi uudelleen");
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    pipes.forEach(function (p) {
      ctx.fillStyle = "#3e8e5a";
      ctx.fillRect(p.x, 0, 30, p.gy);
      ctx.fillRect(p.x, p.gy + p.gh, 30, H - p.gy - p.gh);
      ctx.fillStyle = "#6fd597";
      ctx.fillRect(p.x, p.gy - 6, 30, 6);
      ctx.fillRect(p.x, p.gy + p.gh, 30, 6);
    });
    ctx.fillStyle = "#e2b46a";
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(bird.x + 2, bird.y - 4, 4, 3); // "silmä"
    ctx.fillStyle = "#e9e7e0";
    ctx.font = "bold 13px monospace";
    ctx.fillText(passed + " / " + GATES, 10, 20);
    if (!started) {
      ctx.fillStyle = "rgba(233,231,224,.75)";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Kosketa aloittaaksesi", W / 2, H * 0.62);
      ctx.textAlign = "left";
    }
  }

  var last = 0;
  g.raf(function loop(t) {
    if (!g.alive()) return;
    var dt = t - last || 16;
    last = t;
    tick(dt);
    draw();
    g.raf(loop);
  });

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
  reset();
  return g.cleanup;
};
