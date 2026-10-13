// Pulmatyyppi: slider15 - 4x4 liukupalapeli ("sirpalekuva")
// params: { size: 4, shuffle: 80 }
// guess = "kuvakoottu"
window.Steps["slider15"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var N = P.size || 4;
  var SHUFFLE = P.shuffle || 80;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Järjestä palat 1-" + (N * N - 1));

  var board = document.createElement("div");
  board.style.cssText =
    "display:grid;grid-template-columns:repeat(" + N + ",1fr);gap:6px;" +
    "max-width:340px;margin:1rem auto";
  container.appendChild(board);

  var tiles = [];
  for (var i = 1; i < N * N; i++) tiles.push(i);
  tiles.push(0); // tyhja
  var emptyIdx = tiles.length - 1;
  var moves = 0;
  var cellEls = [];

  function idxRC(i) { return [Math.floor(i / N), i % N]; }
  function adjacent(a, b) {
    var A = idxRC(a), B = idxRC(b);
    return Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) === 1;
  }

  // Sekoita tekemalla satunnaisia siirtoja ratkaistusta tilasta
  function shuffle() {
    for (var k = 0; k < SHUFFLE; k++) {
      var e = emptyIdx;
      var opts = [];
      var r = idxRC(e);
      if (r[0] > 0) opts.push(e - N);
      if (r[0] < N - 1) opts.push(e + N);
      if (r[1] > 0) opts.push(e - 1);
      if (r[1] < N - 1) opts.push(e + 1);
      var pick = opts[Math.floor(Math.random() * opts.length)];
      var t = tiles[e]; tiles[e] = tiles[pick]; tiles[pick] = t;
      emptyIdx = pick;
    }
    moves = 0;
  }

  function isSolved() {
    for (var i = 0; i < tiles.length - 1; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return true;
  }

  function render() {
    board.innerHTML = "";
    cellEls = [];
    tiles.forEach(function (v, i) {
      var c = document.createElement("button");
      c.className = "grid-cell";
      c.style.cssText += ";font-family:var(--mono);font-weight:600;font-size:1.2rem;color:var(--accent)";
      if (v === 0) {
        c.style.background = "transparent";
        c.style.border = "1px dashed var(--line)";
        c.disabled = true;
      } else {
        c.textContent = v;
        if (adjacent(i, emptyIdx)) {
          c.style.borderColor = "var(--sys)";
        }
        (function (idx) {
          c.addEventListener("click", function () {
            if (!adjacent(idx, emptyIdx)) return;
            var t = tiles[idx]; tiles[idx] = 0; tiles[emptyIdx] = t;
            emptyIdx = idx;
            moves++;
            status.set("Siirtoja: " + moves);
            if (window.Audio) window.Audio.tick();
            render();
            if (isSolved()) {
              status.set("Kuva koottu! Siirtoja: " + moves);
              if (window.Audio) window.Audio.success();
              submit("kuvakoottu");
            }
          });
        })(i);
      }
      board.appendChild(c);
      cellEls.push(c);
    });
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  var btnRow = document.createElement("div");
  btnRow.className = "pz-actions";
  var sh = document.createElement("button");
  sh.className = "btn ghost";
  sh.style.flex = "1";
  sh.textContent = "Sekoita uudelleen";
  sh.addEventListener("click", function () { shuffle(); render(); });
  btnRow.appendChild(sh);
  container.appendChild(btnRow);

  U.hint(container, api);
  shuffle();
  render();
  return g.cleanup;
};
