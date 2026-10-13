// Pulmatyyppi: order - jarjesta kohteet oikein (ylos/alas-napit, mobiiliystavallinen)
// params: { items: [{id, label}] } - jarjestys sekoitetaan alussa
// guess = id:t jarjestyksessa "+"-erotin.
window.Steps["order"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var items = (params.items || []).slice();

  // Sekoita (deterministinen riittaa - ei oikea satunnaisuus valttamaton)
  for (var i = items.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = items[i]; items[i] = items[j]; items[j] = t;
  }

  U.prompt(container, step.prompt);

  var list = document.createElement("div");
  container.appendChild(list);

  function render() {
    list.innerHTML = "";
    items.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "order-item";
      var h = document.createElement("span");
      h.className = "handle";
      h.textContent = (idx + 1) + ".";
      var lb = document.createElement("span");
      lb.textContent = it.label;
      var mv = document.createElement("div");
      mv.className = "mv";
      var up = document.createElement("button");
      up.textContent = "▲";
      var dn = document.createElement("button");
      dn.textContent = "▼";
      up.addEventListener("click", function () {
        if (idx === 0) return;
        var t = items[idx - 1]; items[idx - 1] = items[idx]; items[idx] = t;
        if (window.Audio) window.Audio.tick();
        render();
      });
      dn.addEventListener("click", function () {
        if (idx === items.length - 1) return;
        var t = items[idx + 1]; items[idx + 1] = items[idx]; items[idx] = t;
        if (window.Audio) window.Audio.tick();
        render();
      });
      mv.appendChild(up); mv.appendChild(dn);
      row.appendChild(h); row.appendChild(lb); row.appendChild(mv);
      list.appendChild(row);
    });
  }
  render();

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.button(container, "Vahvista jarjestys", function () {
    submit(items.map(function (i) { return i.id; }).join("+"));
  }, true);
  U.hint(container, api);
};
