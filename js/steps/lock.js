// Pulmatyyppi: lock - numerolukkopyorat
// params: { digits: 4, min?: 0, max?: 9 }
window.Steps["lock"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  U.prompt(container, step.prompt);

  var digits = (step.params && step.params.digits) || 4;
  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  var wrap = document.createElement("div");
  wrap.className = "lock-dials";
  var vals = [];

  for (var i = 0; i < digits; i++) {
    (function (idx) {
      vals[idx] = 0;
      var d = document.createElement("div");
      d.className = "dial";
      var up = document.createElement("button");
      up.textContent = "▲";
      var v = document.createElement("div");
      v.className = "d-val";
      v.textContent = "0";
      var down = document.createElement("button");
      down.textContent = "▼";
      function set(n) {
        vals[idx] = (n + 10) % 10;
        v.textContent = vals[idx];
        if (window.Audio) window.Audio.tick();
      }
      up.addEventListener("click", function () { set(vals[idx] + 1); });
      down.addEventListener("click", function () { set(vals[idx] - 1); });
      d.appendChild(up); d.appendChild(v); d.appendChild(down);
      wrap.appendChild(d);
    })(i);
  }
  container.appendChild(wrap);

  U.button(container, "Avaa lukko", function () {
    submit(vals.join(""));
  }, true);
  U.hint(container, api);
};
