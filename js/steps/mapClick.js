// Pulmatyyppi: mapClick - klikkaa oikea kohta kartalla (Leaflet + OSM)
// params: { center: [lat,lng], zoom: 13, snapDeg: 0.002, markerHint? }
// guess = napsautuksen ruutu "lat_lng" snapDeg-tarkkuudella.
window.Steps["mapClick"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var center = params.center || [61.0, 25.65];
  var zoom = params.zoom || 13;
  var snap = params.snapDeg || 0.002;

  U.prompt(container, step.prompt);

  var wrap = document.createElement("div");
  wrap.className = "map-wrap";
  container.appendChild(wrap);

  var hint = document.createElement("div");
  hint.className = "muted";
  hint.style.cssText = "text-align:center;font-size:.8rem;margin-top:.6rem";
  hint.textContent = "Klikkaa karttaa merkitaksesi sijainnin";
  container.appendChild(hint);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);

  var map = null, marker = null, guess = null;

  function initMap() {
    if (map) return;
    map = L.map(wrap, { attributionControl: true }).setView(center, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    map.on("click", function (e) {
      var lat = e.latlng.lat, lng = e.latlng.lng;
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(map);
      // Ruutuindeksit kokonaislukuina -> solutions.answers = "cx_cy"
      guess = Math.round(lat / snap) + "_" + Math.round(lng / snap);
      hint.textContent = "Sijainti merkitty - vahvista alla";
      if (window.Audio) window.Audio.click();
    });
    setTimeout(function () { map.invalidateSize(); }, 250);
  }

  // Leaflet ladataan vain kun tata tyyppia tarvitaan
  if (window.L) {
    initMap();
  } else {
    var s = document.createElement("script");
    s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    s.onload = initMap;
    document.head.appendChild(s);
  }

  var btn = U.button(container, "Vahvista sijainti", function () {
    if (!guess) {
      fb.show("Klikkaa ensin karttaa.", true);
      return;
    }
    submit(guess);
  }, true);
  btn.disabled = false;
  U.hint(container, api);
};
