// Pulmatyyppi: breakout - maila+pallo, riko kaikki tiilet
// params: { rows: 4, cols: 7, lives: 3 }
// guess = "seinamurtunut"
window.Steps["breakout"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var ROWS = P.rows || 4, COLS = P.cols || 7, LIVES = P.lives || 3;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Riko kaikki tiilet");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.15);
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var paddle, ball, bricks, lives, remaining, running;

  function reset(keepLives) {
    paddle = { w: W * .22, h: 10, x: W / 2 - W * .11, y: H - 26 };
    ball = { x: W / 2, y: H - 40, r: 6, vx: W * .0045, vy: -W * .0055 };
    if (!keepLives) {
      lives = LIVES;
      bricks = [];
      var bw = (W - 20 - (COLS - 1) * 5) / COLS;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          // ylin rivi on vahvistettua (2 osumaa)
          bricks.push({
            x: 10 + c * (bw + 5), y: 30 + r * 22,
            w: bw, h: 16, hit: false,
            hp: r === 0 ? 2 : 1,
            hue: ["#7d3c98", "#c0392b", "#2980b9", "#27ae60", "#f1c40f"][r % 5]
          });
        }
      }
      remaining = ROWS * COLS;
    }
    running = false;
  }

  function start() { if (!running && remaining > 0) { running = true; requestLoop(); } }

  function requestLoop() {
    g.raf(function () { if (running && g.alive()) { tick(); requestLoop(); } });
  }

  function tick() {
    // pallo
    ball.x += ball.vx; ball.y += ball.vy;
    if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
    if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; }
    if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }

    // maila
    if (ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 6 &&
        ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r && ball.vy > 0) {
      var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      var spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.03;
      var ang = hit * 1.1; // max ~63 astetta
      ball.vx = spd * Math.sin(ang);
      ball.vy = -Math.abs(spd * Math.cos(ang));
      if (window.Audio) window.Audio.tick();
    }

    // tiilet
    bricks.forEach(function (b) {
      if (b.hit) return;
      if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
          ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
        ball.vy *= -1;
        b.hp--;
        if (b.hp <= 0) {
          b.hit = true;
          remaining--;
          // pallo kiihtyy joka rikotulla tiilella
          var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.025;
          var cur = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
          ball.vx = ball.vx / cur * sp;
          ball.vy = ball.vy / cur * sp;
        }
        if (window.Audio) window.Audio.click();
        status.set("Tiiliä jäljellä: " + remaining);
        if (remaining <= 0) {
          running = false;
          status.set("Muuri murtui!");
          submit("seinamurtunut");
        }
      }
    });

    // pohja -> elama pois
    if (ball.y > H + 10) {
      lives--;
      if (navigator.vibrate) navigator.vibrate(80);
      if (window.Audio) window.Audio.error();
      if (lives <= 0) {
        status.set("Elämät loppu - aloitetaan alusta");
        reset(false);
      } else {
        status.set("Pallo meni! Elämiä: " + lives);
        reset(true);
      }
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    bricks.forEach(function (b) {
      if (b.hit) return;
      ctx.fillStyle = b.hue;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.hp === 2) {
        ctx.strokeStyle = "rgba(233,231,224,.7)";
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
      }
    });
    ctx.fillStyle = "#e2b46a";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, 7);
    ctx.fillStyle = "#e9e7e0";
    ctx.fill();
    if (!running && remaining > 0) {
      ctx.fillStyle = "rgba(233,231,224,.8)";
      ctx.font = "14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Kosketa mailaa ja aloita", W / 2, H / 2);
    }
  }

  // mailan ohjaus: kosketus/hiiri seuraa x-sijaintia
  function moveTo(clientX) {
    var r = cv.el.getBoundingClientRect();
    paddle.x = Math.max(0, Math.min(W - paddle.w, (clientX - r.left) * (W / r.width) - paddle.w / 2));
    start();
  }
  cv.el.addEventListener("touchmove", function (e) { e.preventDefault(); moveTo(e.touches[0].clientX); }, { passive: false });
  cv.el.addEventListener("touchstart", function (e) { moveTo(e.touches[0].clientX); }, { passive: true });
  cv.el.addEventListener("pointermove", function (e) { if (e.buttons || e.pointerType === "mouse") moveTo(e.clientX); });
  cv.el.addEventListener("pointerdown", function (e) { moveTo(e.clientX); });

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  reset(false);
  draw();
  return g.cleanup;
};
