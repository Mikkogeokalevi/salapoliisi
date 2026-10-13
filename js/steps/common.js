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

  window.StepsUI = U;
})();
