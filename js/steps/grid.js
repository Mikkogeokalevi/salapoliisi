// Pulmatyyppi: grid - lights-out -ruudukko (kaikki paalle / pois)
// params: { size: 3, startOn: [indices], goal: "on"|"off" }
// guess = lopputilanne bittijonomaisena (esim. "111111111").
window.Steps["grid"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var size = params.size || 3;
  var goalOff = params.goal === "off";
  var state = [];
  var cells = [];

  for (var i = 0; i < size * size; i++) state[i] = false;
  (params.startOn || []).forEach(function (i) { state[i] = true; });

  U.prompt(container, step.prompt);

  var board = document.createElement("div");
  board.className = "grid-board";
  board.style.gridTemplateColumns = "repeat(" + size + ", 1fr)";

  function toggle(idx) {
    var r = Math.floor(idx / size), c = idx % size;
    [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].forEach(function (p) {
      if (p[0] < 0 || p[0] >= size || p[1] < 0 || p[1] >= size) return;
      var i = p[0] * size + p[1];
      state[i] = !state[i];
      cells[i].classList.toggle("on", state[i]);
    });
    if (window.Audio) window.Audio.tick();
    checkDone();
  }

  function isGoal() {
    return state.every(function (v) { return goalOff ? !v : v; });
  }

  function checkDone() {
    if (isGoal()) {
      status.textContent = "Ratkaistu!";
      submit(state.map(function (v) { return v ? "1" : "0"; }).join(""));
    }
  }

  for (var i = 0; i < size * size; i++) {
    (function (idx) {
      var c = document.createElement("button");
      c.className = "grid-cell" + (state[idx] ? " on" : "");
      c.addEventListener("click", function () { toggle(idx); });
      board.appendChild(c);
      cells.push(c);
    })(i);
  }
  container.appendChild(board);

  var status = document.createElement("div");
  status.className = "muted";
  status.style.cssText = "text-align:center;font-family:var(--mono);font-size:.75rem;margin-top:.6rem";
  status.textContent = goalOff ? "Sammuta kaikki valot" : "Sytyta kaikki valot";
  container.appendChild(status);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
};
