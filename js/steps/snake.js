// Pulmatyyppi: snake - matopeli. Tavoite: syo N omenaa.
// params: { apples: 12, grid: 17, speed: 160 } (speed = aloitus-ms, pienenee)
// guess = "omena" + apples
window.Steps["snake"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var APPLES = P.apples || 12;
  var N = P.grid || 17;
  var startSpeed = P.speed || 160;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Tavoite: " + APPLES + " omenaa");

  var SZ = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var cv = U.canvas(container, SZ, SZ);
  var ctx = cv.ctx;
  var cell = SZ / N;

  var snake, dir, nextDir, apple, eaten, speed, alive, started;

  function reset() {
    snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    eaten = 0;
    speed = startSpeed;
    alive = true;
    spawnApple();
    status.set("Tavoite: " + APPLES + " omenaa");
  }

  function spawnApple() {
    do {
      apple = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) };
    } while (snake.some(function (s) { return s.x === apple.x && s.y === apple.y; }));
  }

  function setDir(d) {
    var map = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
    var nd = map[d];
    if (!nd) return;
    // ei 180-asteen kaannosta
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
    if (!started) { started = true; loop(); }
  }

  function tick() {
    if (!alive) return;
    dir = nextDir;
    var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
        snake.some(function (s) { return s.x === head.x && s.y === head.y; })) {
      alive = false;
      status.set("OSUIT! Yritys uudelleen - paina suuntaa");
      if (window.Audio) window.Audio.error();
      if (navigator.vibrate) navigator.vibrate(120);
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
    // hilaviivat
    ctx.strokeStyle = "rgba(38,50,74,.35)";
    for (var i = 1; i < N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, SZ); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(SZ, i * cell); ctx.stroke();
    }
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
    loopId = g.timeout(speed, loop);
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  // Ohjaus
  U.swipe(cv.el, setDir);
  U.dpad(container, setDir);

  reset();
  draw();
  return g.cleanup;
};
