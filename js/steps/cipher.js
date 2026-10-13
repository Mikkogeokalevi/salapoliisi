// Pulmatyyppi: cipher - Caesar-salaus dekoodattavana
// params: { cipherText: "...", alphabet?: "A-Z...", showWheel?: true }
window.Steps["cipher"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var alpha = (params.alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ").split("");
  var alphaIdx = {};
  alpha.forEach(function (ch, i) { alphaIdx[ch.toLowerCase()] = i; });

  U.prompt(container, step.prompt);

  // Salattu teksti
  var cipherBox = document.createElement("div");
  cipherBox.className = "card mono";
  cipherBox.style.cssText = "font-size:1.15rem;letter-spacing:.18em;color:var(--sys);text-align:center;margin:.8rem 0";
  cipherBox.textContent = params.cipherText || "";
  container.appendChild(cipherBox);

  // Live-selvitys: nayta teksti dekoodattuna nykyisella siirroksella
  var shift = 0;
  var preview = document.createElement("div");
  preview.className = "mono";
  preview.style.cssText = "font-size:1.5rem;letter-spacing:.2em;text-align:center;color:var(--accent);margin:.2rem 0 .6rem;min-height:2rem;font-weight:600";

  function decodedText() {
    var s = String(params.cipherText || "");
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var idx = alphaIdx[s[i].toLowerCase()];
      out += idx == null ? s[i] : alpha[(idx - shift + alpha.length) % alpha.length];
    }
    return out;
  }

  var rowTop = document.createElement("div");
  var rowBot = document.createElement("div");
  rowTop.className = "cipher-alpha";
  rowBot.className = "cipher-alpha";

  var lblT = document.createElement("div");
  var lblB = document.createElement("div");
  var lblCss = "font-family:var(--mono);font-size:.62rem;letter-spacing:.15em;color:var(--text-faint);margin-top:.6rem;text-align:center";
  lblT.style.cssText = lblCss;
  lblT.textContent = "SALATTU";
  lblB.style.cssText = lblCss;
  lblB.textContent = "SELVAKIELINEN";

  function renderAlpha() {
    rowTop.innerHTML = "";
    rowBot.innerHTML = "";
    alpha.forEach(function (ch, i) {
      var a = document.createElement("span");
      a.textContent = ch;
      rowTop.appendChild(a);
      var b = document.createElement("span");
      // Ylarivin merkki i salautuu alarivin merkiksi (i+shift)
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
    preview.textContent = decodedText();
    renderAlpha();
    if (window.Audio) window.Audio.tick();
  }
  minus.addEventListener("click", function () { setShift(shift - 1); });
  plus.addEventListener("click", function () { setShift(shift + 1); });
  ctrl.appendChild(minus); ctrl.appendChild(val); ctrl.appendChild(plus);

  var lab = document.createElement("div");
  lab.className = "muted";
  lab.style.cssText = "text-align:center;font-family:var(--mono);font-size:.7rem;letter-spacing:.1em";
  lab.textContent = "SIIRROS - pyorita kunnes ylla oleva teksti on jarkeva";

  container.appendChild(preview);
  container.appendChild(ctrl);
  container.appendChild(lab);
  container.appendChild(lblT);
  container.appendChild(rowTop);
  container.appendChild(lblB);
  container.appendChild(rowBot);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.answerRow(container, "Selvitetty sana...", "Laheta", submit);
  U.hint(container, api);
  setShift(0);
};
