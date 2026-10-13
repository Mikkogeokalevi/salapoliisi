// Pulmatyyppi: wires - leikkaa oikea(t) johto(imet) logiikkasaannoilla
// params: { wires: [{id, label, color}], rules: ["...", ...], maxCuts?: 1 }
// guess = valittujen johtimien id:t aakkosjarjestyksessa "+"-erotin.
window.Steps["wires"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var wires = params.wires || [];
  var maxCuts = params.maxCuts || 1;
  var selected = {};

  U.prompt(container, step.prompt);

  if (params.rules && params.rules.length) {
    var rc = document.createElement("div");
    rc.className = "card";
    rc.style.cssText = "font-size:.85rem;color:var(--text-dim);margin-bottom:1rem";
    rc.innerHTML = "<b style='color:var(--accent)'>OHJEET:</b><br>" +
      params.rules.join("<br>");
    container.appendChild(rc);
  }

  var list = document.createElement("div");
  wires.forEach(function (w) {
    var row = document.createElement("button");
    row.className = "wire-row";
    row.style.width = "100%";
    row.style.textAlign = "left";
    var sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = w.color || "#888";
    var lb = document.createElement("span");
    lb.textContent = w.label || w.id;
    row.appendChild(sw);
    row.appendChild(lb);
    row.addEventListener("click", function () {
      if (selected[w.id]) {
        delete selected[w.id];
        row.classList.remove("cut");
      } else {
        if (Object.keys(selected).length >= maxCuts) return;
        selected[w.id] = true;
        row.classList.add("cut");
        if (window.Audio) window.Audio.click();
      }
    });
    list.appendChild(row);
  });
  container.appendChild(list);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.button(container, "Leikkaa valitut", function () {
    var ids = Object.keys(selected).sort();
    if (!ids.length) {
      fb.show("Valitse ensin johto.", true);
      return;
    }
    submit(ids.join("+"));
  }, true);
  U.hint(container, api);
};
