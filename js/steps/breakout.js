// Pulmatyyppi: breakout - maila+pallot, riko kaikki tiilet.
// v3: useampia ja pienempia tiilia, vahvistettuja riveja, satunnaisia
// voima-upseja: M=lisapallo, W=leveampi maila, S=hitaampi pallo.
// params: { rows: 5, cols: 9, lives: 3, powerChance: .16 }
// guess = "seinamurtunut"
window.Steps["breakout"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var ROWS = P.rows || 5, COLS = P.cols || 9, LIVES = P.lives || 3;
  var PWR = P.powerChance != null ? P.powerChance : .16;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Riko kaikki tiilet");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var H = Math.floor(W * 1.08);
  var PADDLE_Y = H - 78; // mailan alle jaa ohjausalue: sormi ei peita mailaa
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var paddle, balls, bricks, powerups, lives, remaining, running, armed;
  var baseSpeed = W * .0062;
  var wideUntil = 0, slowUntil = 0;

  var startBtn = U.button(container, "Aloita murtaminen", function () {
    if (armed) return;
    armed = true;
    if (startBtn) { startBtn.parentNode.remove(); startBtn = null; }
    status.set("Kosketa mailaa - riko kaikki tiilet");
  }, true);

  function speedNow() {
    var s = baseSpeed;
    if (Date.now() < slowUntil) s *= .7;
    return s;
  }

  function mkBall(x, y, ang) {
    var sp = speedNow();
    return { x: x, y: y, r: 5, vx: sp * Math.sin(ang), vy: -Math.abs(sp * Math.cos(ang)) };
  }

  function reset(keepLives) {
    var pw = W * .18;
    paddle = { w: Date.now() < wideUntil ? pw * 1.4 : pw, wBase: pw, h: 9, x: W / 2 - pw / 2, y: PADDLE_Y };
    balls = [mkBall(W / 2, PADDLE_Y - 14, 0.2)];
    powerups = [];
    if (!keepLives) {
      lives = LIVES;
      bricks = [];
      var bw = (W - 16 - (COLS - 1) * 3) / COLS;
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          // kaksi ylinta rivia vahvistettuja
          bricks.push({
            x: 8 + c * (bw + 3), y: 26 + r * 17,
            w: bw, h: 12, hit: false,
            hp: r === 0 ? 2 : (r === 1 ? (Math.random() < .5 ? 2 : 1) : 1),
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

  function spawnPower(x, y) {
    if (Math.random() >= PWR) return;
    var types = ["multi", "wide", "slow"];
    powerups.push({ x: x, y: y, vy: H * .0028, type: types[Math.floor(Math.random() * types.length)] });
  }

  function applyPower(t) {
    if (t === "multi") {
      var b = balls[0] || { x: W / 2, y: H / 2, vx: 0, vy: -1 };
      balls.push(mkBall(b.x, b.y, -0.8));
      if (balls.length < 4) balls.push(mkBall(b.x, b.y, 0.8));
      status.set("LISAPALLO! " + balls.length + " palloa pelissä");
    } else if (t === "wide") {
      wideUntil = Date.now() + 10000;
      paddle.w = paddle.wBase * 1.5;
      status.set("LEVEÄ MAILA 10 s!");
    } else if (t === "slow") {
      slowUntil = Date.now() + 8000;
      var sp = speedNow();
      balls.forEach(function (b) {
        var cur = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        b.vx = b.vx / cur * sp; b.vy = b.vy / cur * sp;
      });
      status.set("HIDAS PALLO 8 s!");
    }
    if (window.Audio) window.Audio.click();
  }

  function tick() {
    // paddle-efektin umpeutuminen
    if (Date.now() > wideUntil && paddle.w !== paddle.wBase) paddle.w = paddle.wBase;

    // pallot
    for (var bi = balls.length - 1; bi >= 0; bi--) {
      var ball = balls[bi];
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; }

      // maila
      if (ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 6 &&
          ball.x >= paddle.x - ball.r && ball.x <= paddle.x + paddle.w + ball.r && ball.vy > 0) {
        var hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        var spd = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.02;
        var ang = hit * 1.1;
        ball.vx = spd * Math.sin(ang);
        ball.vy = -Math.abs(spd * Math.cos(ang));
        if (window.Audio) window.Audio.tick();
      }

      // tiilet
      for (var ti = 0; ti < bricks.length; ti++) {
        var b = bricks[ti];
        if (b.hit) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
            ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          ball.vy *= -1;
          b.hp--;
          if (b.hp <= 0) {
            b.hit = true;
            remaining--;
            spawnPower(b.x + b.w / 2, b.y + b.h / 2);
            var sp = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 1.015;
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
          break; // yksi tiili per frame per pallo
        }
      }

      // pohja
      if (ball.y > H + 10) balls.splice(bi, 1);
    }

    // kaikki pallot menneet -> elama
    if (!balls.length) {
      lives--;
      if (navigator.vibrate) navigator.vibrate(80);
      if (window.Audio) window.Audio.error();
      if (lives <= 0) {
        status.set("Elämät loppu - aloitetaan alusta");
        reset(false);
      } else {
        status.set("Pallot menivät! Elämiä: " + lives);
        reset(true);
      }
    }

    // voima-upit
    for (var pi = powerups.length - 1; pi >= 0; pi--) {
      var p = powerups[pi];
      p.y += p.vy;
      if (p.y >= paddle.y - 6 && p.y <= paddle.y + paddle.h + 10 &&
          p.x >= paddle.x - 8 && p.x <= paddle.x + paddle.w + 8) {
        applyPower(p.type);
        powerups.splice(pi, 1);
      } else if (p.y > H + 10) powerups.splice(pi, 1);
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
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3);
      }
    });
    // voima-upit
    powerups.forEach(function (p) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, 7);
      ctx.fillStyle = p.type === "multi" ? "#6fd597" : p.type === "wide" ? "#5ec8d8" : "#e2b46a";
      ctx.fill();
      ctx.fillStyle = "#0c1119";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.type === "multi" ? "M" : p.type === "wide" ? "W" : "S", p.x, p.y + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });
    // ohjausalue mailan alla: sormi restataan tanne, nakyva rajaviiva
    var oz = PADDLE_Y + 18;
    ctx.fillStyle = "rgba(226,180,106,.05)";
    ctx.fillRect(0, oz, W, H - oz);
    ctx.strokeStyle = "rgba(226,180,106,.3)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(0, oz); ctx.lineTo(W, oz); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(233,231,224,.4)";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("- ohjausalue -", W / 2, H - 12);
    ctx.textAlign = "left";

    ctx.fillStyle = "#e2b46a";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    balls.forEach(function (b) {
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7);
      ctx.fillStyle = "#e9e7e0"; ctx.fill();
    });
    if (armed && !running && remaining > 0) {
      ctx.fillStyle = "rgba(233,231,224,.8)";
      ctx.font = "13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("Kosketa mailaa ja aloita", W / 2, H / 2);
      ctx.textAlign = "left";
    }
  }

  // mailan ohjaus
  function moveTo(clientX) {
    if (!armed) return; // vaadi Aloita-nappi ensin
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
