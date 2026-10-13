// Pulmatyyppi: mines - miinakentta. Paljasta kaikki turvalliset ruudut.
// params: { size: 6, mines: 7 }
// guess = "selvitetty" + size + "x" + mines
window.Steps["mines"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var N = P.size || 6;
  var MINES = P.mines || 7;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Paljasta turvalliset ruudut - " + MINES + " miinaa");

  var mineField, revealed, flagged, dead, won, firstClick;

  var board = document.createElement("div");
  board.style.cssText =
    "display:grid;grid-template-columns:repeat(" + N + ",1fr);gap:4px;" +
    "max-width:340px;margin:1rem auto";
  container.appendChild(board);

  var flagMode = false;
  var flagBtn = document.createElement("button");
  flagBtn.className = "btn ghost";
  flagBtn.style.cssText = "width:100%;margin-bottom:.6rem";
  flagBtn.textContent = "⛏ Kaivuutila (vaihda liputukseen)";
  flagBtn.addEventListener("click", function () {
    flagMode = !flagMode;
    flagBtn.textContent = flagMode ? "🚩 Liputustila (vaihda kaivuuseen)" : "⛏ Kaivuutila (vaihda liputukseen)";
  });
  container.insertBefore(flagBtn, board);

  function reset() {
    mineField = []; revealed = []; flagged = [];
    for (var i = 0; i < N * N; i++) { mineField.push(0); revealed.push(false); flagged.push(false); }
    dead = false; won = false; firstClick = true;
    status.set("Paljasta turvalliset ruudut - " + MINES + " miinaa");
    render();
  }

  function plant(safeIdx) {
    var placed = 0;
    while (placed < MINES) {
      var i = Math.floor(Math.random() * N * N);
      if (mineField[i] === -1 || i === safeIdx) continue;
      mineField[i] = -1;
      placed++;
    }
    for (var i = 0; i < N * N; i++) {
      if (mineField[i] === -1) continue;
      var r = Math.floor(i / N), c = i % N, n = 0;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N && mineField[nr * N + nc] === -1) n++;
      }
      mineField[i] = n;
    }
  }

  function flood(i) {
    var stack = [i];
    while (stack.length) {
      var cur = stack.pop();
      if (revealed[cur] || flagged[cur]) continue;
      revealed[cur] = true;
      if (mineField[cur] !== 0) continue;
      var r = Math.floor(cur / N), c = cur % N;
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        var nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) stack.push(nr * N + nc);
      }
    }
  }

  function checkWin() {
    for (var i = 0; i < N * N; i++) {
      if (mineField[i] !== -1 && !revealed[i]) return false;
    }
    return true;
  }

  function clickCell(i) {
    if (dead || won) return;
    if (flagMode) {
      flagged[i] = !flagged[i];
      render();
      return;
    }
    if (flagged[i] || revealed[i]) return;
    if (firstClick) { plant(i); firstClick = false; }
    if (mineField[i] === -1) {
      dead = true;
      revealed[i] = true;
      status.set("MIINA! Kosketa ruutua aloittaaksesi uudelleen.");
      if (window.Audio) window.Audio.error();
      if (navigator.vibrate) navigator.vibrate(150);
      render();
      return;
    }
    flood(i);
    if (window.Audio) window.Audio.click();
    render();
    if (checkWin()) {
      won = true;
      status.set("Kenttä selvitetty!");
      if (window.Audio) window.Audio.success();
      submit("selvitetty" + N + "x" + MINES);
    }
  }

  function render() {
    board.innerHTML = "";
    for (var i = 0; i < N * N; i++) {
      (function (idx) {
        var c = document.createElement("button");
        c.className = "grid-cell";
        c.style.cssText += ";aspect-ratio:1;font-weight:700;font-size:1rem";
        if (revealed[idx]) {
          c.disabled = true;
          if (mineField[idx] === -1) {
            c.textContent = "💥";
            c.style.background = "var(--err)";
          } else {
            c.textContent = mineField[idx] || "";
            c.style.color = ["", "#5ec8d8", "#6fd597", "#e2b46a", "#e56b6b", "#9b59b6", "#f1c40f", "#e9e7e0", "#fff"][mineField[idx]] || "#fff";
            c.style.background = "var(--surface-2)";
          }
        } else if (flagged[idx]) {
          c.textContent = "🚩";
        }
        c.addEventListener("click", function () {
          if (dead) { reset(); return; }
          clickCell(idx);
        });
        board.appendChild(c);
      })(i);
    }
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
  reset();
  return g.cleanup;
};
