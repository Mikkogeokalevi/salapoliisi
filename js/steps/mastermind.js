// Pulmatyyppi: mastermind - murra neljän symbolin koodi
// params: { code: "0123" (symbol-indeksit), symbols: ["🟥","🟦"...], attempts: 10 }
// guess = murkettu koodi (symbol-indeksit joinattuna)
window.Steps["mastermind"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var CODE = String(P.code || "0123");
  var SYMS = P.symbols || ["🟥", "🟦", "🟩", "🟨", "🟪", "⬛"];
  var MAX = P.attempts || 10;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Murra koodi - " + MAX + " yritystä");

  var len = CODE.length;
  var attempts = 0;
  var cur = [];

  // Pysyva selite palloista
  var legend = document.createElement("div");
  legend.className = "muted";
  legend.style.cssText = "font-size:.75rem;text-align:center;margin:-.3rem 0 .6rem;line-height:1.5";
  legend.innerHTML = "● = oikea symboli OIKEALLA paikalla<br>○ = oikea symboli VAARALLA paikalla";
  container.appendChild(legend);

  // Historia
  var hist = document.createElement("div");
  hist.style.cssText = "margin-bottom:1rem";
  container.appendChild(hist);

  // Nykyinen arvaus
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;justify-content:center;margin:.8rem 0";
  var slots = [];
  for (var i = 0; i < len; i++) {
    (function (idx) {
      var s = document.createElement("button");
      s.className = "grid-cell";
      s.style.cssText += ";width:52px;height:52px;font-size:1.4rem;border-radius:12px";
      s.textContent = "·";
      cur[idx] = -1;
      s.addEventListener("click", function () {
        cur[idx] = (cur[idx] + 1) % SYMS.length;
        s.textContent = SYMS[cur[idx]];
        if (window.Audio) window.Audio.tick();
      });
      row.appendChild(s);
      slots.push(s);
    })(i);
  }
  container.appendChild(row);

  // Symbolinappiparivalikko (vaihtoehto klikkaukselle)
  var palette = document.createElement("div");
  palette.style.cssText = "display:flex;gap:6px;justify-content:center;margin-bottom:.6rem;flex-wrap:wrap";
  SYMS.forEach(function (sym, i) {
    var b = document.createElement("button");
    b.style.cssText = "font-size:1.2rem;padding:.3rem .5rem;border:1px solid var(--line);border-radius:8px;background:var(--surface)";
    b.textContent = sym;
    b.addEventListener("click", function () {
      // tayta ensimmainen tyhja tai vaihda viimeista
      var idx = cur.indexOf(-1);
      if (idx === -1) idx = len - 1;
      cur[idx] = i;
      slots[idx].textContent = sym;
      if (window.Audio) window.Audio.tick();
    });
    palette.appendChild(b);
  });
  container.appendChild(palette);

  function evaluate(guess) {
    var black = 0, white = 0;
    var gc = guess.split(""), cc = CODE.split("");
    var usedG = gc.map(function () { return false; });
    var usedC = cc.map(function () { return false; });
    for (var i = 0; i < len; i++) {
      if (gc[i] === cc[i]) { black++; usedG[i] = usedC[i] = true; }
    }
    for (var i = 0; i < len; i++) {
      if (usedG[i]) continue;
      for (var j = 0; j < len; j++) {
        if (!usedC[j] && gc[i] === cc[j]) { white++; usedC[j] = true; break; }
      }
    }
    return { black: black, white: white };
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  var btn = document.createElement("button");
  btn.className = "btn primary";
  btn.style.width = "100%";
  btn.textContent = "Tarkista koodi";
  btn.addEventListener("click", function () {
    if (cur.indexOf(-1) !== -1) {
      fb.show("Täytä kaikki paikat ensin.", true);
      return;
    }
    attempts++;
    var guess = cur.join("");
    var r = evaluate(guess);

    var line = document.createElement("div");
    line.className = "mono";
    line.style.cssText = "text-align:center;padding:.35rem 0;border-bottom:1px solid var(--line);font-size:.9rem";
    var pegs = "";
    for (var k = 0; k < r.black; k++) pegs += "●";
    for (var k = 0; k < r.white; k++) pegs += "○";
    line.innerHTML =
      "<span style='color:var(--text)'>" + attempts + ". " +
      cur.map(function (i) { return SYMS[i]; }).join(" ") +
      "</span>  <span style='color:var(--accent)'>" + pegs + "</span>";
    hist.insertBefore(line, hist.firstChild);
    if (window.Audio) window.Audio.click();

    if (r.black === len) {
      status.set("Koodi murrettu: " + attempts + " yrityksellä");
      if (window.Audio) window.Audio.success();
      submit(guess);
      return;
    }
    if (attempts >= MAX) {
      fb.show("Yritykset loppuivat - koodi pysyy, yrityssarja nollaantuu.", true);
      attempts = 0;
      hist.innerHTML = "";
      cur = cur.map(function () { return -1; });
      slots.forEach(function (s) { s.textContent = "·"; });
      return;
    }
    status.set("Yrityksiä jäljellä: " + (MAX - attempts));
    cur = cur.map(function () { return -1; });
    slots.forEach(function (s) { s.textContent = "·"; });
  });
  container.appendChild(btn);
  U.hint(container, api);
  return g.cleanup;
};
