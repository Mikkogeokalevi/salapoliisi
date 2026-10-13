// Pulmatyyppi: hanoi - Hanoi tornit. Siirra N kiekkoa toiseen tankoon.
// params: { disks: 4 }
// guess = "hanoi" + disks
window.Steps["hanoi"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var DISKS = P.disks || 4;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Siirrä kaikki " + DISKS + " kiekkoa oikeaan tankoon");

  var pegs = [[], [], []];
  for (var i = DISKS; i >= 1; i--) pegs[0].push(i);
  var selected = -1; // mista tangosta kiekko nostettu
  var moves = 0;
  var MIN = Math.pow(2, DISKS) - 1;

  var board = document.createElement("div");
  board.style.cssText = "display:flex;gap:8px;justify-content:center;margin:1rem auto;max-width:360px";
  container.appendChild(board);

  var pegEls = [];

  function render() {
    pegEls = [];
    board.innerHTML = "";
    for (var p = 0; p < 3; p++) {
      (function (pi) {
        var col = document.createElement("button");
        col.style.cssText =
          "flex:1;display:flex;flex-direction:column-reverse;align-items:center;" +
          "min-height:" + (DISKS * 30 + 40) + "px;gap:4px;padding:8px 4px;" +
          "background:var(--surface);border:2px solid " + (selected === pi ? "var(--accent)" : "var(--line)") +
          ";border-radius:10px;cursor:pointer";
        // tanko
        var base = document.createElement("div");
        base.style.cssText = "width:80%;height:4px;background:var(--line);border-radius:2px;margin-top:4px";
        pegs[pi].forEach(function (d) {
          var disk = document.createElement("div");
          disk.style.cssText =
            "height:26px;border-radius:6px;width:" + (30 + d * (70 / DISKS)) + "%;" +
            "background:" + ["#5ec8d8", "#6fd597", "#e2b46a", "#e56b6b", "#9b59b6", "#f1c40f"][d - 1] +
            ";box-shadow:0 2px 4px rgba(0,0,0,.4)";
          if (selected === pi && d === pegs[pi][pegs[pi].length - 1]) {
            disk.style.outline = "2px solid var(--accent)";
            disk.style.transform = "translateY(-4px)";
          }
          col.appendChild(disk);
        });
        col.appendChild(base);
        col.addEventListener("click", function () { tapPeg(pi); });
        board.appendChild(col);
        pegEls.push(col);
      })(p);
    }
  }

  function tapPeg(pi) {
    if (selected === -1) {
      if (!pegs[pi].length) return;
      selected = pi;
      if (window.Audio) window.Audio.tick();
    } else if (selected === pi) {
      selected = -1;
    } else {
      var disk = pegs[selected][pegs[selected].length - 1];
      var top = pegs[pi][pegs[pi].length - 1];
      if (top && top < disk) {
        fb.show("Isompi kiekko ei voi mennä pienemmän päälle.", true);
        if (window.Audio) window.Audio.error();
        selected = -1;
      } else {
        pegs[pi].push(pegs[selected].pop());
        moves++;
        status.set("Siirtoja: " + moves + " (minimi " + MIN + ")");
        if (window.Audio) window.Audio.click();
        selected = -1;
        if (pegs[2].length === DISKS) {
          status.set("Torni siirretty! " + moves + " siirrolla.");
          if (window.Audio) window.Audio.success();
          submit("hanoi" + DISKS);
        }
      }
    }
    render();
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
  render();
  return g.cleanup;
};
