// Salapoliisi - steps/_common.js: pulmamoduulien yhteiset apurit
//
// Jokainen pulmatyyppi rekisteroityy: window.Steps[type] = renderFn
// renderFn(container, step, api)
//   step = { id, type, title, prompt, params, hints[] }
//   api  = { try(guess)->Promise<{ok,error?}>, hint()->string|null, feedback(msg,isErr) }
//
// Moduulit rakentavat UI:nsa containeriin ja kutsuvat api.try() arvauksella.

(function () {
  "use strict";

  window.Steps = {};

  var U = {};

  // Ohjeteksti (adminin tuottamaa sisaltoa - innerHTML sallittu)
  U.prompt = function (container, html) {
    if (!html) return null;
    var p = document.createElement("div");
    p.className = "pz-prompt";
    p.innerHTML = html;
    container.appendChild(p);
    return p;
  };

  // Tekstikentta + lahetysnappi
  U.answerRow = function (container, placeholder, btnText, onSubmit) {
    var row = document.createElement("div");
    row.className = "pz-actions";
    var inp = document.createElement("input");
    inp.className = "input mono";
    inp.placeholder = placeholder || "Vastaus...";
    inp.autocomplete = "off";
    inp.autocapitalize = "none";
    inp.setAttribute("enterkeyhint", "done");
    var btn = document.createElement("button");
    btn.className = "btn primary";
    btn.textContent = btnText || "Laheta";
    function go() { onSubmit(inp.value); }
    btn.addEventListener("click", go);
    inp.addEventListener("keydown", function (e) {
      if (e.key === "Enter") go();
    });
    row.appendChild(inp);
    row.appendChild(btn);
    container.appendChild(row);
    return { input: inp, button: btn };
  };

  // Yksi nappi (vahvistus tms.)
  U.button = function (container, text, onClick, primary) {
    var row = document.createElement("div");
    row.className = "pz-actions";
    var btn = document.createElement("button");
    btn.className = "btn " + (primary ? "primary" : "ghost");
    btn.style.flex = "1";
    btn.textContent = text;
    btn.addEventListener("click", onClick);
    row.appendChild(btn);
    container.appendChild(row);
    return btn;
  };

  // Palautealue ("Vaara vastaus" ym.)
  U.feedback = function (container) {
    var f = document.createElement("div");
    f.className = "notice";
    f.style.display = "none";
    f.style.marginTop = "1rem";
    container.appendChild(f);
    return {
      show: function (msg, isErr) {
        f.textContent = msg;
        f.className = "notice" + (isErr ? " err" : " ok");
        f.style.display = "block";
      },
      hide: function () { f.style.display = "none"; }
    };
  };

  // Vihjenappi
  U.hint = function (container, api) {
    var btn = document.createElement("button");
    btn.className = "hint-btn";
    var n = 0;
    btn.textContent = "Vihje";
    var box = null;
    btn.addEventListener("click", function () {
      var h = api.hint();
      if (!h) {
        btn.textContent = "Ei enempaa vihjeita";
        btn.disabled = true;
        return;
      }
      n++;
      if (!box) {
        box = document.createElement("div");
        box.className = "hint-box";
        container.appendChild(box);
      }
      box.textContent = "Vihje " + n + ": " + h;
      btn.textContent = "Vihje (" + n + " kaytetty)";
    });
    container.appendChild(btn);
    return btn;
  };

  // Yleinen submit-apuri: feedback + shake + vihjekehotus
  U.submitter = function (container, api, fb) {
    return function (guess) {
      if (fb) fb.hide();
      return api.try(guess).then(function (r) {
        if (r.ok) return true;
        if (r.error) {
          if (fb) fb.show("Yhteysvirhe - yrita uudelleen.", true);
          return false;
        }
        var el = container.querySelector(".sheet-body") || container;
        el.classList.remove("shake");
        void el.offsetWidth;
        el.classList.add("shake");
        if (navigator.vibrate) navigator.vibrate(80);
        var n = api.wrong();
        if (fb) {
          var m = "Vaara vastaus.";
          if (n >= 2) m += " Vihje auttaisi?";
          fb.show(m, true);
        }
        return false;
      });
    };
  };

  // --- Peliapurit --------------------------------------------------
  //
  // U.game() -> konteksti jolla timerit/raf-kuuntelijat siivotaan
  // automaattisesti kun sheet suljetaan:
  //   var g = U.game(); g.every(ms, fn); g.on(el, ev, fn);
  //   palauta render() funktiosta g.cleanup
  U.game = function () {
    var timers = [], rafs = [], listeners = [];
    var dead = false;
    return {
      every: function (ms, fn) { timers.push(setInterval(fn, ms)); },
      timeout: function (ms, fn) { timers.push(setTimeout(fn, ms)); },
      raf: function (fn) { if (!dead) rafs.push(requestAnimationFrame(fn)); },
      on: function (el, ev, fn) { el.addEventListener(ev, fn); listeners.push([el, ev, fn]); },
      alive: function () { return !dead; },
      cleanup: function () {
        dead = true;
        timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
        rafs.forEach(cancelAnimationFrame);
        listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
      }
    };
  };

  // Canvas-naytto
  U.canvas = function (container, w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    c.style.cssText =
      "width:100%;max-width:" + w + "px;display:block;margin:0 auto;" +
      "border:1px solid var(--line);border-radius:12px;background:#0c1119;" +
      "touch-action:none";
    container.appendChild(c);
    return { el: c, ctx: c.getContext("2d") };
  };

  // Swipe-havaitsija (touch + hiiri): cb("left|right|up|down")
  U.swipe = function (el, cb) {
    var sx = 0, sy = 0, tracking = false;
    function down(x, y) { sx = x; sy = y; tracking = true; }
    function move(x, y) {
      if (!tracking) return;
      var dx = x - sx, dy = y - sy;
      if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
      tracking = false;
      cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    }
    el.addEventListener("touchstart", function (e) { down(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener("touchmove", function (e) { move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    el.addEventListener("pointerdown", function (e) { down(e.clientX, e.clientY); });
    el.addEventListener("pointermove", function (e) { move(e.clientX, e.clientY); });
    el.addEventListener("pointerup", function () { tracking = false; });
  };

  // Ruudulla napit (dpad) — mobiilivaraus swipelle
  U.dpad = function (container, cb) {
    var g = document.createElement("div");
    g.style.cssText = "display:grid;grid-template-columns:repeat(3,64px);gap:6px;justify-content:center;margin-top:.8rem";
    function mk(label, dir) {
      var b = document.createElement("button");
      b.className = "btn";
      b.style.minHeight = "52px";
      b.textContent = label;
      b.addEventListener("click", function () { cb(dir); });
      g.appendChild(b);
      return b;
    }
    g.appendChild(document.createElement("span"));
    mk("▲", "up");
    g.appendChild(document.createElement("span"));
    mk("◀", "left");
    mk("▼", "down");
    mk("▶", "right");
    container.appendChild(g);
    return g;
  };

  // Pelin otsikkorivi (tavoite + tila)
  U.statusLine = function (container, text) {
    var s = document.createElement("div");
    s.className = "muted";
    s.style.cssText = "text-align:center;font-family:var(--mono);font-size:.78rem;margin:.5rem 0";
    s.textContent = text;
    container.appendChild(s);
    return {
      set: function (t) { s.textContent = t; }
    };
  };

  window.StepsUI = U;
})();
