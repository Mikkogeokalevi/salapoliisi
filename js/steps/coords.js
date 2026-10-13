// Pulmatyyppi: coords - koordinaattien syotto
// params: { decimals?: 2 } -> arvaus muotoa "60.98,25.66"
window.Steps["coords"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  U.prompt(container, step.prompt);

  var dec = (step.params && step.params.decimals) || 2;
  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  var row = document.createElement("div");
  row.className = "pz-actions";
  function mkInp(ph) {
    var i = document.createElement("input");
    i.className = "input mono";
    i.placeholder = ph;
    i.inputMode = "decimal";
    i.setAttribute("enterkeyhint", "done");
    return i;
  }
  var lat = mkInp("N 60.98...");
  var lng = mkInp("E 25.66...");
  var btn = document.createElement("button");
  btn.className = "btn primary";
  btn.textContent = "Laheta";
  btn.addEventListener("click", function () {
    var la = parseFloat(String(lat.value).replace(",", "."));
    var lo = parseFloat(String(lng.value).replace(",", "."));
    if (isNaN(la) || isNaN(lo)) {
      fb.show("Syota koordinaatit numeroina, esim. 60.98 ja 25.66", true);
      return;
    }
    submit(la.toFixed(dec) + "," + lo.toFixed(dec));
  });
  row.appendChild(lat);
  row.appendChild(lng);
  row.appendChild(btn);
  container.appendChild(row);
  U.hint(container, api);
};
