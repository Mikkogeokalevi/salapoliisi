// Pulmatyyppi: maze - PIMEA pakoreitti. Naet vain muutaman ruudun
// ymparillesi (taskulamppu). Loyda N avainta, jotka avaavat uloskaynnin.
// params: { cols: 11, rows: 15, keys: 3, sight: 2 } (pariton luku suositeltu)
// guess = "reitti" + cols + "x" + rows
window.Steps["maze"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var COLS = (P.cols || 11) | 1;
  var ROWS = (P.rows || 15) | 1;
  var NKEYS = P.keys || 3;
  var SIGHT = P.sight != null ? P.sight : 2;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Etsi " + NKEYS + " avainta ja uloskaynti");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var cell = Math.floor(W / COLS);
  var H = cell * ROWS;
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  var walls = [];
  for (var r = 0; r < ROWS; r++) { walls.push([]); for (var c = 0; c < COLS; c++) walls[r][c] = true; }

  function gen() {
    var stack = [[1, 1]];
    walls[1][1] = false;
    var dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    while (stack.length) {
      var cur = stack[stack.length - 1];
      var opts = dirs.filter(function (d) {
        var nr = cur[0] + d[0], nc = cur[1] + d[1];
        return nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && walls[nr][nc];
      });
      if (!opts.length) { stack.pop(); continue; }
      var d = opts[Math.floor(Math.random() * opts.length)];
      walls[cur[0] + d[0] / 2][cur[1] + d[1] / 2] = false;
      walls[cur[0] + d[0]][cur[1] + d[1]] = false;
      stack.push([cur[0] + d[0], cur[1] + d[1]]);
    }
    walls[ROWS - 2][COLS - 1] = false; // uloskaynti
  }

  // Avaimet: etaisimmilla soluilla (kauimpana alkupisteesta, BFS)
  var keys = [];
  function placeKeys() {
    var dist = []; var q = [[1, 1]];
    for (var r = 0; r < ROWS; r++) dist.push(new Array(COLS).fill(-1));
    dist[1][1] = 0;
    while (q.length) {
      var cur = q.shift();
      [[0,1],[0,-1],[1,0],[-1,0]].forEach(function (d) {
        var nr = cur[0] + d[0], nc = cur[1] + d[1];
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
            !walls[nr][nc] && dist[nr][nc] === -1) {
          dist[nr][nc] = dist[cur[0]][cur[1]] + 1;
          q.push([nr, nc]);
        }
      });
    }
    var cells = [];
    for (var r = 1; r < ROWS - 1; r++)
      for (var c = 1; c < COLS - 1; c++)
        if (!walls[r][c] && dist[r][c] > 6 &&
            !(r === ROWS - 2 && c === COLS - 1)) cells.push({ r: r, c: c, d: dist[r][c] });
    cells.sort(function (a, b) { return b.d - a.d; });
    var used = [[1, 1]];
    for (var i = 0; i < cells.length && keys.length < NKEYS; i++) {
      var cand = cells[i];
      var far = used.every(function (u) {
        return Math.abs(u[0] - cand.r) + Math.abs(u[1] - cand.c) > 6;
      });
      if (far) { keys.push(cand); used.push([cand.r, cand.c]); }
    }
  }

  var px = 1, py = 1, found = 0, done = false, moves = 0;

  function tryMove(dr, dc) {
    if (done) return;
    var nr = py + dr, nc = px + dc;
    if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || walls[nr][nc]) return;
    px = nc; py = nr;
    moves++;
    if (window.Audio) window.Audio.tick();
    // avain?
    keys = keys.filter(function (k) {
      if (k.r === py && k.c === px) {
        found++;
        if (window.Audio) window.Audio.click();
        status.set("Avain! " + found + " / " + NKEYS + " - jatka etsimista");
        return false;
      }
      return true;
    });
    // uloskaynti
    if (py === ROWS - 2 && px === COLS - 1) {
      if (found >= NKEYS) {
        done = true;
        status.set("Ulos! " + moves + " askelta, " + found + " avainta");
        if (window.Audio) window.Audio.success();
        submit("reitti" + COLS + "x" + ROWS);
      } else {
        status.set("LUKITTU - puuttuu " + (NKEYS - found) + " avainta");
        if (window.Audio) window.Audio.error();
      }
    }
  }

  function draw() {
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        var d = Math.abs(r - py) + Math.abs(c - px);
        if (d > SIGHT) continue; // pimeys
        var fade = d === SIGHT ? .45 : 1;
        if (walls[r][c]) {
          ctx.fillStyle = "rgba(38,50,74," + fade + ")";
          ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        } else {
          ctx.fillStyle = "rgba(18,25,39," + fade + ")";
          ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        }
      }
    }
    // avaimet nakyvissa
    keys.forEach(function (k) {
      var d = Math.abs(k.r - py) + Math.abs(k.c - px);
      if (d > SIGHT) return;
      ctx.fillStyle = "#e2b46a";
      ctx.font = Math.floor(cell * .7) + "px serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("⚿", k.c * cell + cell / 2, k.r * cell + cell / 2 + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });
    // uloskaynti
    var ed = Math.abs(ROWS - 2 - py) + Math.abs(COLS - 1 - px);
    if (ed <= SIGHT) {
      ctx.fillStyle = found >= NKEYS ? "#6fd597" : "#8a6c3e";
      ctx.fillRect((COLS - 1) * cell + 1, (ROWS - 2) * cell + 1, cell - 2, cell - 2);
    }
    // pelaaja + halo
    ctx.fillStyle = "#6fd597";
    ctx.beginPath();
    ctx.arc(px * cell + cell / 2, py * cell + cell / 2, cell * .32, 0, 7);
    ctx.fill();
  }

  var dmap = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  U.swipe(cv.el, function (d) { var v = dmap[d]; if (v) { tryMove(v[0], v[1]); draw(); } });
  U.dpad(container, function (d) { var v = dmap[d]; if (v) { tryMove(v[0], v[1]); draw(); } });
  g.on(document, "keydown", function (e) {
    var k = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];
    if (k) { var v = dmap[k]; tryMove(v[0], v[1]); draw(); }
  });

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  gen();
  placeKeys();
  draw();
  return g.cleanup;
};
