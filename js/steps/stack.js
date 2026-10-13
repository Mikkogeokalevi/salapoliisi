// Pulmatyyppi: stack - tornikasvain. Kosketa pudottaaksesi liikkuvan palan.
// params: { blocks: 10, speed: 2.2 }
// guess = "torni" + blocks
window.Steps["stack"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var GOAL = P.blocks || 10;
  var SPEED = (P.speed || 2.2);

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Kasaa " + GOAL + " kerrosta - kosketa pudottaaksesi");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.1);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var BH = 20;
  var tower, moving, dir, speed, done, dead;

  function reset() {
    tower = [{ x: W / 2 - 60, w: 120 }];
    moving = null;
    done = false; dead = false;
    speed = SPEED;
    spawnMoving();
  }

  function spawnMoving() {
    var prev = tower[tower.length - 1];
    moving = { x: -prev.w, w: prev.w, y: 0 };
    dir = 1;
    speed = SPEED + tower.length * 0.25;
  }

  function drop() {
    if (done || dead || !moving) return;
    var prev = tower[tower.length - 1];
    var left = Math.max(moving.x, prev.x);
    var right = Math.min(moving.x + moving.w, prev.x + prev.w);
    var w = right - left;
    if (w <= 0) {
      dead = true;
      status.set("Ohi! Kosketa aloittaaksesi alusta.");
      if (window.Audio) window.Audio.error();
      if (navigator.vibrate) navigator.vibrate(120);
      return;
    }
    tower.push({ x: left, w: w });
    if (window.Audio) window.Audio.click();
    status.set("Kerroksia: " + tower.length + " / " + (GOAL + 1));
    moving = null;
    if (tower.length - 1 >= GOAL) {
      done = true;
      status.set("Torni valmis!");
      if (window.Audio) window.Audio.success();
      submit("torni" + GOAL);
      return;
    }
    spawnMoving();
  }

  cv.el.addEventListener("pointerdown", function () {
    if (dead) { reset(); return; }
    drop();
  });

  var last = 0;
  function loop(t) {
    if (!g.alive()) return;
    var dt = Math.min(50, t - last || 16);
    last = t;
    if (moving && !dead) {
      moving.x += dir * speed * dt * 0.06;
      if (moving.x < -moving.w) { moving.x = -moving.w; dir = 1; }
      if (moving.x > W) { moving.x = W; dir = -1; }
    }
    draw();
    g.raf(loop);
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    tower.forEach(function (b, i) {
      var y = H - 40 - (tower.length - i) * BH;
      ctx.fillStyle = i % 2 ? "#3e8e5a" : "#6fd597";
      ctx.fillRect(b.x, y, b.w, BH - 2);
    });
    if (moving && !dead) {
      var my = H - 40 - (tower.length + 1) * BH;
      ctx.fillStyle = "#e2b46a";
      ctx.fillRect(moving.x, my, moving.w, BH - 2);
    }
    ctx.fillStyle = "#e9e7e0";
    ctx.font = "bold 13px monospace";
    ctx.fillText((tower.length - 1) + " / " + GOAL, 10, 20);
    if (dead) {
      ctx.fillStyle = "rgba(229,107,107,.9)";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Torni kaatui", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  reset();
  g.raf(loop);
  return g.cleanup;
};
