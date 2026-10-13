// Pulmatyyppi: cipher - Caesar-salaus dekoodattavana
// params: { cipherText: "...", alphabet?: "A-Z...", showWheel?: true }
window.Steps["cipher"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var alpha = (params.alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split("");

  U.prompt(container, step.prompt);

  // Salattu teksti
  var cipherBox = document.createElement("div");
  cipherBox.className = "card mono";
  cipherBox.style.cssText = "font-size:1.1rem;letter-spacing:.15em;color:var(--sys);text-align:center;margin:.8rem 0";
  cipherBox.textContent = params.cipherText || "";
  container.appendChild(cipherBox);

  // Pyoriteltava aakkosto (visuaalinen dekoodausapu)
  var shift = 0;
  var rowTop = document.createElement("div");
  var rowBot = document.createElement("div");
  rowTop.className = "cipher-alpha";
  rowBot.className = "cipher-alpha";

  function renderAlpha() {
    rowTop.innerHTML = "";
    rowBot.innerHTML = "";
    alpha.forEach(function (ch, i) {
      var a = document.createElement("span");
      a.textContent = ch;
      rowTop.appendChild(a);
      var b = document.createElement("span");
      b.textContent = alpha[(i + shift) % alpha.length];
      b.className = "hi";
      rowBot.appendChild(b);
    });
  }

  var ctrl = document.createElement("div");
  ctrl.className = "cipher-ctrl";
  var minus = document.createElement("button");
  minus.className = "btn ghost";
  minus.textContent = "−";
  var val = document.createElement("div");
  val.className = "d-val";
  var plus = document.createElement("button");
  plus.className = "btn ghost";
  plus.textContent = "+";
  function setShift(n) {
    shift = (n + alpha.length) % alpha.length;
    val.textContent = shift;
    renderAlpha();
    if (window.Audio) window.Audio.tick();
  }
  minus.addEventListener("click", function () { setShift(shift - 1); });
  plus.addEventListener("click", function () { setShift(shift + 1); });
  ctrl.appendChild(minus); ctrl.appendChild(val); ctrl.appendChild(plus);

  var lab = document.createElement("div");
  lab.className = "muted";
  lab.style.cssText = "text-align:center;font-family:var(--mono);font-size:.7rem;letter-spacing:.1em;margin-top:.4rem";
  lab.textContent = "SIIRROS";
  container.appendChild(ctrl);
  container.appendChild(lab);
  container.appendChild(rowTop);
  container.appendChild(rowBot);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.answerRow(container, "Selvitetty sana...", "Laheta", submit);
  U.hint(container, api);
  setShift(0);
};
