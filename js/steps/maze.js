// Pulmatyyppi: maze - generoitu labyrintti, etsi uloskaynti.
// params: { cols: 11, rows: 15 } (pariton luku suositeltu)
// guess = "reitti" + cols + "x" + rows
window.Steps["maze"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var COLS = (P.cols || 11) | 1; // pariton
  var ROWS = (P.rows || 15) | 1;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Etsi uloskäynti labyrintistä");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var cell = Math.floor(W / COLS);
  var H = cell * ROWS;
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  // Generointi: rekursiivinen takaisinperaytyminen, walls[r][c]
  var walls = []; // true = seina
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
    walls[ROWS - 2][COLS - 1] = false; // uloskaynti oikealle alhaalta
  }

  var px = 1, py = 1, done = false, moves = 0;

  function tryMove(dr, dc) {
    if (done) return;
    var nr = py + dr, nc = px + dc;
    if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || walls[nr][nc]) return;
    px = nc; py = nr;
    moves++;
    if (window.Audio) window.Audio.tick();
    if (py === ROWS - 2 && px === COLS - 1) {
      done = true;
      status.set("Ulos! " + moves + " askelta");
      if (window.Audio) window.Audio.success();
      submit("reitti" + COLS + "x" + ROWS);
    }
  }

  function draw() {
    ctx.fillStyle = "#0c1119";
    ctx.fillRect(0, 0, W, H);
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (walls[r][c]) {
          ctx.fillStyle = "#26324a";
          ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        }
      }
    }
    // maali
    ctx.fillStyle = "#e2b46a";
    ctx.fillRect((COLS - 1) * cell, (ROWS - 2) * cell, cell, cell);
    // pelaaja
    ctx.fillStyle = "#6fd597";
    ctx.beginPath();
    ctx.arc(px * cell + cell / 2, py * cell + cell / 2, cell * 0.32, 0, 7);
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
  draw();
  return g.cleanup;
};
