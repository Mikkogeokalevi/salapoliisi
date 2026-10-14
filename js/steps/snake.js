// Pulmatyyppi: snake - matopeli v2.
// Reunat ovat lapaisvia (wrap-around), omaan itseen osuminen lopettaa.
// Pommit ilmestyvat ja katoavat - niihin ei saa osua.
// params: { apples: 12, grid: 17, speed: 160, bombs: 2, bombTtl: 4500 }
// guess = "omena" + apples
window.Steps["snake"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var APPLES = P.apples || 12;
  var N = P.grid || 17;
  var startSpeed = P.speed || 160;
  var NBOMBS = P.bombs || 2;
  var BOMB_TTL = P.bombTtl || 4500;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Tavoite: " + APPLES + " omenaa - varo pommeja!");

  var SZ = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var cv = U.canvas(container, SZ, SZ);
  var ctx = cv.ctx;
  var cell = SZ / N;

  var snake, dir, nextDir, apple, eaten, speed, alive, started, bombs, armed;

  var startBtn = U.button(container, "Aloita peli", function () {
    if (armed) return;
    armed = true;
    if (startBtn) { startBtn.parentNode.remove(); startBtn = null; }
    status.set("Anna suunta - " + APPLES + " omenaa, varo pommeja!");
  }, true);

  function reset() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    eaten = 0;
    speed = startSpeed;
    alive = true;
    armed = false;
    bombs = [];
    spawnApple();
    status.set("Tavoite: " + APPLES + " omenaa - varo pommeja!");
  }

  function freeCell() {
    var p, tries = 0;
    do {
      p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
      tries++;
    } while (tries < 400 && (
      snake.some(function (s) { return s.x === p.x && s.y === p.y; }) ||
      bombs.some(function (b) { return b.x === p.x && b.y === p.y; }) ||
      (apple && apple.x === p.x && apple.y === p.y)
    ));
    return p;
  }

  function spawnApple() { apple = freeCell(); }

  function spawnBomb() {
    if (bombs.length >= NBOMBS || !alive) return;
    var p = freeCell();
    p.until = Date.now() + BOMB_TTL;
    bombs.push(p);
    g.timeout(BOMB_TTL + 60, function () {
      bombs = bombs.filter(function (b) { return b.until > Date.now(); });
    });
  }

  function setDir(d) {
    var map = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
    var nd = map[d];
    if (!nd) return;
    if (!armed && !started) return; // peli ei ole alkanut - vaadi Aloita-nappi
    if (!alive) {
      reset(); // kuoleman jalkeen: uusi yritys heti
      armed = true;
    }
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
    if (!started) {
      started = true;
      loop();
      // pommien spawnaus
      g.every(2600, spawnBomb);
    }
  }

  function tick() {
    if (!alive) return;
    dir = nextDir;
    var head = {
      x: (snake[0].x + dir.x + N) % N,
      y: (snake[0].y + dir.y + N) % N
    };

    // pommi tai itse -> kuolema
    if (snake.some(function (s) { return s.x === head.x && s.y === head.y; }) ||
        bombs.some(function (b) { return b.x === head.x && b.y === head.y; })) {
      alive = false;
      status.set("OSUIT! Kosketa suuntaa aloittaaksesi uudelleen");
      if (window.Audio) window.Audio.error();
      if (navigator.vibrate) navigator.vibrate(150);
      return;
    }

    snake.unshift(head);
    if (head.x === apple.x && head.y === apple.y) {
      eaten++;
      if (window.Audio) window.Audio.click();
      speed = Math.max(70, speed - 7);
      status.set("Omenoita: " + eaten + " / " + APPLES);
      if (eaten >= APPLES) {
        alive = false;
        status.set("Kohdetaso saavutettu!");
        if (window.Audio) window.Audio.success();
        submit("omena" + APPLES);
        return;
      }
      spawnApple();
    } else {
      snake.pop();
    }
    draw();
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, SZ, SZ);
    ctx.strokeStyle = "rgba(38,50,74,.35)";
    for (var i = 1; i < N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, SZ); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(SZ, i * cell); ctx.stroke();
    }
    // pommit: syttymisvilahtelu loppua kohden
    var now = Date.now();
    bombs.forEach(function (b) {
      var left = b.until - now;
      if (left < 1200 && Math.floor(now / 150) % 2 === 0) return; // vilkkuminen
      ctx.fillStyle = "#e56b6b";
      ctx.beginPath();
      ctx.arc(b.x * cell + cell / 2, b.y * cell + cell / 2, cell * .4, 0, 7);
      ctx.fill();
      ctx.fillStyle = "#0c1119";
      ctx.font = Math.floor(cell * .55) + "px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("✕", b.x * cell + cell / 2, b.y * cell + cell / 2);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });
    // omena
    ctx.fillStyle = "#e2b46a";
    ctx.beginPath();
    ctx.arc(apple.x * cell + cell / 2, apple.y * cell + cell / 2, cell * .38, 0, 7);
    ctx.fill();
    // mato
    snake.forEach(function (s, i) {
      ctx.fillStyle = i === 0 ? "#6fd597" : "#3e8e5a";
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
  }

  var loopId = null;
  function loop() {
    if (!g.alive()) return;
    tick();
    g.timeout(speed, loop);
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  U.swipe(cv.el, setDir);
  U.dpad(container, setDir);

  reset();
  draw();
  return g.cleanup;
};
