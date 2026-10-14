// Pulmatyyppi: range - tarkkuusammunta. Maalit pomppaavat esiin
// ruudukosta rajatun ajan: punainen maalitaulu = ammu,
// sininen sivili = ala ammu. Tyhjaan ruutuun ampuminen = huti.
// params: { goal: 15, maxMiss: 3, cols: 4, rows: 3,
//           spawnMs: 700, visibleMs: 1150, decoy: 0.35 }
// guess = "osumat" + goal
window.Steps["range"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var GOAL = P.goal || 15;
  var MAXMISS = P.maxMiss != null ? P.maxMiss : 3;
  var COLS = P.cols || 4;
  var ROWS = P.rows || 3;
  var SPAWN = P.spawnMs || 700;
  var VISIBLE = P.visibleMs || 1150;
  var DECOY = P.decoy != null ? P.decoy : 0.35;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Osumia 0 / " + GOAL + " · huteja 0 / " + MAXMISS);

  var grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(" + COLS +
    ",1fr);gap:8px;max-width:360px;margin:0 auto";
  container.appendChild(grid);

  var cells = [];
  var i;
  for (i = 0; i < COLS * ROWS; i++) {
    var cell = document.createElement("button");
    cell.type = "button";
    cell.style.cssText =
      "aspect-ratio:1;border:1px solid var(--line);border-radius:10px;" +
      "background:#0c1119;padding:0;touch-action:manipulation;position:relative;";
    (function (idx) {
      cell.addEventListener("click", function () { shoot(idx); });
    })(i);
    grid.appendChild(cell);
    cells.push({ el: cell, target: null });
  }

  var hits = 0, misses = 0, done = false, tid = 0, started = false;

  var startBtn;
  startBtn = U.button(container, "Aloita rata", function () {
    if (started) return;
    started = true;
    if (startBtn) { startBtn.parentNode.remove(); startBtn = null; }
    status.set("Valmiina - maalit tulossa...");
    g.timeout(700, spawn);
    g.every(SPAWN, spawn);
  }, true);

  function setStatus() {
    status.set("Osumia " + hits + " / " + GOAL + " · huteja " + misses + " / " + MAXMISS);
  }

  function flash(color) {
    grid.style.boxShadow = "0 0 0 3px " + color;
    g.timeout(160, function () { grid.style.boxShadow = "none"; });
  }

  function removeTarget(c) {
    if (c.target) {
      c.el.innerHTML = "";
      c.target = null;
    }
  }

  function spawn() {
    if (done || !g.alive() || !started) return;
    var free = cells.filter(function (c) { return !c.target; });
    if (!free.length) return;
    var c = free[Math.floor(Math.random() * free.length)];
    var hostile = Math.random() >= DECOY;
    var t = document.createElement("div");
    var vis = Math.max(620, VISIBLE - hits * 18);
    t.style.cssText =
      "position:absolute;inset:12%;border-radius:50%;" +
      "animation:tgtpop .12s ease-out;transition:opacity .15s;" +
      (hostile
        ? "background:radial-gradient(circle,#fff 14%,#e05555 15%,#e05555 45%,#fff 46%,#fff 60%,#e05555 61%);"
        : "background:radial-gradient(circle,#9db4ff 18%,#3557c9 19%,#3557c9 82%,#24397e 83%);");
    c.el.appendChild(t);
    var id = ++tid;
    c.target = { id: id, hostile: hostile, el: t };
    t.style.opacity = "1";
    var fadeAt = vis - 260; // haalistuu lopussa = aika loppuu
    g.timeout(Math.max(0, fadeAt), function () {
      if (c.target && c.target.id === id) t.style.opacity = "0.35";
    });
    g.timeout(vis, function () {
      if (!c.target || c.target.id !== id || done) return;
      var wasHostile = c.target.hostile;
      removeTarget(c);
      if (wasHostile) miss("Maali karkasi");
    });
  }

  function shoot(idx) {
    if (done || !started) return;
    var c = cells[idx];
    if (!c.target) {
      miss("Huti - tyhjä laukaus");
      return;
    }
    var hostile = c.target.hostile;
    removeTarget(c);
    if (hostile) {
      hits++;
      if (window.Audio) window.Audio.click();
      flash("rgba(111,213,151,.7)");
      setStatus();
      if (hits >= GOAL) {
        done = true;
        cells.forEach(removeTarget);
        status.set("Tarkkaa työtä - " + GOAL + " osumaa");
        if (window.Audio) window.Audio.success();
        submit("osumat" + GOAL);
      }
    } else {
      miss("Siviili osui - älä ammu sinisiä");
    }
  }

  function miss(why) {
    if (done) return;
    misses++;
    if (window.Audio) window.Audio.error();
    flash("rgba(224,85,85,.7)");
    status.set(why + " (" + misses + " / " + MAXMISS + ")");
    if (misses >= MAXMISS) {
      misses = 0; hits = 0;
      cells.forEach(removeTarget);
      status.set("Rata nollattu - alusta alusta");
      g.timeout(900, setStatus);
    }
  }

  // tyylit: ponnahdusanimaatio
  var st = document.createElement("style");
  st.textContent = "@keyframes tgtpop{from{transform:scale(.3)}to{transform:scale(1)}}";
  container.appendChild(st);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  setStatus();
  return g.cleanup;
};
