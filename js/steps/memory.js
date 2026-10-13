// Pulmatyyppi: memory - kaanna todistekorttiparit
// params: { pairs: 6, symbols?: [] } (emojit)
// guess = "parit" + pairs
window.Steps["memory"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var PAIRS = P.pairs || 6;
  var SYMBOLS = P.symbols || ["🔍", "🗝️", "📻", "🧩", "🗺️", "🔦", "📸", "⏰"].slice(0, PAIRS);

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Loyda kaikki parit");

  var board = document.createElement("div");
  board.style.cssText =
    "display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:360px;margin:1rem auto";
  container.appendChild(board);

  var deck = SYMBOLS.concat(SYMBOLS);
  for (var i = deck.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
  }

  var open = [], matched = 0, lock = false, moves = 0;

  function flip(card) {
    if (lock || card.dataset.open === "1" || card.dataset.done === "1") return;
    card.dataset.open = "1";
    card.textContent = card.dataset.sym;
    card.style.background = "var(--surface-2)";
    card.style.transform = "rotateY(180deg)";
    if (window.Audio) window.Audio.tick();
    open.push(card);
    if (open.length === 2) {
      lock = true;
      moves++;
      var a = open[0], b = open[1];
      if (a.dataset.sym === b.dataset.sym) {
        a.dataset.done = b.dataset.done = "1";
        a.style.borderColor = b.style.borderColor = "var(--ok)";
        matched++;
        status.set("Pareja: " + matched + " / " + PAIRS + " (siirtoja " + moves + ")");
        open = [];
        lock = false;
        if (matched >= PAIRS) {
          status.set("Kaikki parit loytyivat!");
          if (window.Audio) window.Audio.success();
          submit("parit" + PAIRS);
        }
      } else {
        g.timeout(750, function () {
          [a, b].forEach(function (c) {
            c.dataset.open = "0";
            c.textContent = "?";
            c.style.background = "var(--surface)";
          });
          open = [];
          lock = false;
        });
      }
    }
  }

  deck.forEach(function (sym) {
    var c = document.createElement("button");
    c.className = "grid-cell";
    c.dataset.sym = sym;
    c.dataset.open = "0";
    c.style.cssText += ";font-size:1.5rem;aspect-ratio:3/4;min-height:60px";
    c.textContent = "?";
    c.addEventListener("click", function () { flip(c); });
    board.appendChild(c);
  });

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
  return g.cleanup;
};
