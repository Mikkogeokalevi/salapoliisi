// Pulmatyyppi: laser - peilipeli. Napauta peileja kaantaaksesi niiden
// suuntaa (/ tai \). Johdata lasersade lahteesta vastaanottimeen.
// Rata generoidaan joka peliin: polku asetetaan peilin kaanteilla,
// loput peilit ovat haitteja. Ratkaisu varmistetaan simuloimalla.
// params: { size: 7, turns: 5, decoys: 5 }
// guess = "valo" + size
window.Steps["laser"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var N = P.size || 7;
  var TURNS = P.turns || 5;
  var DECOYS = P.decoys != null ? P.decoys : 5;

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Johdata säde vastaanottimeen");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var cell = Math.floor(W / N);
  var H = cell * N;
  var cv = U.canvas(container, W, H);
  var ctx = cv.ctx;

  // Peili: { r, c, o } o = "/" tai "\", need = vaadittu suunta ratkaisuun
  var mirrors = [], emitter = null, receiver = null, beam = [];

  function inside(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }

  // Generoi ratkaistava rata: emitter vasemmasta reunasta,
  // TURNS kaannetta, receiver siella missa sade lopulta osuu.
  function gen() {
    for (var att = 0; att < 300; att++) {
      mirrors = [];
      var used = {};
      var r = 1 + Math.floor(Math.random() * (N - 2)), c = 0;
      var d = [0, 1]; // oikealle
      emitter = { r: r, c: c, d: d.slice() };
      used[r + "," + c] = true;
      var ok = true, cur = [r, c], mirrorCells = {};

      for (var t = 0; t < TURNS && ok; t++) {
        // etenema: ei saa osua aiempaan peiliin (sade heijastuisi)
        var max = 0, tr = cur[0], tc = cur[1];
        while (inside(tr + d[0], tc + d[1]) && !mirrorCells[(tr + d[0]) + "," + (tc + d[1])]) {
          tr += d[0]; tc += d[1]; max++;
        }
        if (max < 3) { ok = false; break; }
        var s = 2 + Math.floor(Math.random() * Math.min(max - 1, 3));
        // peili ei saa osua jo kaytettyyn soluun
        if (used[(cur[0] + d[0] * s) + "," + (cur[1] + d[1] * s)]) { ok = false; break; }
        // kay polku kaytetyksi, peili loppuun
        for (var k = 1; k <= s; k++) {
          cur[0] += d[0]; cur[1] += d[1];
          used[cur[0] + "," + cur[1]] = true;
        }
        // valitse kaannossuunta jossa tilaa jatkaa
        var perps = d[0] === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
        var opts = perps.filter(function (pd) {
          var n1 = (cur[0] + pd[0]) + "," + (cur[1] + pd[1]);
          var n2 = (cur[0] + pd[0] * 2) + "," + (cur[1] + pd[1] * 2);
          return inside(cur[0] + pd[0], cur[1] + pd[1]) &&
                 inside(cur[0] + pd[0] * 2, cur[1] + pd[1] * 2) &&
                 !mirrorCells[n1] && !mirrorCells[n2];
        });
        if (!opts.length) { ok = false; break; }
        var nd = opts[Math.floor(Math.random() * opts.length)];
        // peilin vaadittu suunta: / heijastaa (dr,dc)->(-dc,-dr), \ ->(dc,dr)
        var need = (nd[0] === -d[1] && nd[1] === -d[0]) ? "/" : "\\";
        mirrorCells[cur[0] + "," + cur[1]] = true;
        mirrors.push({ r: cur[0], c: cur[1], need: need, o: Math.random() < 0.5 ? "/" : "\\" });
        d = nd;
      }
      if (!ok || mirrors.length < TURNS) continue;

      // receiver: sade jatkaa vimeisesta peilista reunaan asti
      // (eika saa osua peiliin matkalla)
      var rr = cur[0], cc = cur[1], dist = 0;
      while (inside(rr + d[0], cc + d[1]) && !mirrorCells[(rr + d[0]) + "," + (cc + d[1])]) {
        rr += d[0]; cc += d[1]; dist++;
      }
      if (dist < 2) continue;
      receiver = { r: rr, c: cc };
      used[rr + "," + cc] = true;

      // ratkaisupolun solut kaytetyksi (haitta-peilit eivat saa rikkoa sita)
      var solCells = {};
      mirrors.forEach(function (m) { m.o = m.need; });
      trace(solCells);
      for (var key in solCells) used[key] = true;

      // sekoita nayttosuumat pois ratkaisusta
      mirrors.forEach(function (m) { m.o = Math.random() < 0.5 ? "/" : "\\"; });

      // haittapeilit tyhjiin soluihin
      var empt = [];
      for (var er = 0; er < N; er++)
        for (var ec = 0; ec < N; ec++)
          if (!used[er + "," + ec]) empt.push([er, ec]);
      for (var i = 0; i < DECOYS && empt.length; i++) {
        var pick = empt.splice(Math.floor(Math.random() * empt.length), 1)[0];
        mirrors.push({ r: pick[0], c: pick[1], need: null, o: Math.random() < 0.5 ? "/" : "\\" });
      }

      // jos rata jo valmiiksi ratkaistu, vaaranna yksi ratkaisupeili
      if (trace(null)) {
        var sol = mirrors.filter(function (m) { return m.need; });
        var flip = sol[Math.floor(Math.random() * sol.length)];
        flip.o = flip.need === "/" ? "\\" : "/";
      }
      return true;
    }
    return false;
  }

  var mirrorAt = {};
  function indexMirrors() {
    mirrorAt = {};
    mirrors.forEach(function (m) { mirrorAt[m.r + "," + m.c] = m; });
  }

  // Simuloi sade. Palauttaa true jos osuu receiveriin.
  // cells != null -> kerataan polun solut piirtoa varten.
  function trace(cells) {
    var r = emitter.r, c = emitter.c, d = emitter.d.slice();
    var seen = {};
    for (var i = 0; i < N * N * 4; i++) {
      r += d[0]; c += d[1];
      if (!inside(r, c)) return false;
      var key = r + "," + c;
      if (cells) cells[key] = true;
      if (receiver && r === receiver.r && c === receiver.c) return true;
      var m = mirrorAt[key];
      if (m) {
        if (seen[key + d[0] + d[1]]) return false; // silmukka
        seen[key + d[0] + d[1]] = true;
        d = m.o === "/" ? [-d[1], -d[0]] : [d[1], d[0]];
      }
    }
    return false;
  }

  var done = false, taps = 0;

  function draw() {
    var cells = {};
    var hit = trace(cells);
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    // ruudukko
    ctx.strokeStyle = "rgba(40,52,76,.5)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
    }
    // sade
    {
      ctx.strokeStyle = hit ? "#e8c05a" : "rgba(232,192,90,.75)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#e8c05a"; ctx.shadowBlur = 8;
      // jaa polku uudelleen ja piirra
      var r = emitter.r, c = emitter.c, d = emitter.d.slice();
      ctx.beginPath();
      ctx.moveTo(c * cell + cell / 2, r * cell + cell / 2);
      for (var s = 0; s < N * N * 4; s++) {
        r += d[0]; c += d[1];
        if (!inside(r, c)) {
          // piirra reunaan asti
          var er = Math.max(0, Math.min(N - 1, r)), ec = Math.max(0, Math.min(N - 1, c));
          ctx.lineTo(ec * cell + cell / 2 + d[1] * cell / 2, er * cell + cell / 2 + d[0] * cell / 2);
          break;
        }
        ctx.lineTo(c * cell + cell / 2, r * cell + cell / 2);
        if (receiver && r === receiver.r && c === receiver.c) break;
        var m = mirrorAt[r + "," + c];
        if (m) d = m.o === "/" ? [-d[1], -d[0]] : [d[1], d[0]];
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    // emitter
    ctx.fillStyle = "#5ec8e8";
    ctx.beginPath();
    ctx.moveTo(emitter.c * cell + 4, emitter.r * cell + cell / 2);
    ctx.lineTo(emitter.c * cell + cell * .55, emitter.r * cell + 6);
    ctx.lineTo(emitter.c * cell + cell * .55, emitter.r * cell + cell - 6);
    ctx.closePath(); ctx.fill();
    // receiver
    if (receiver) {
      ctx.strokeStyle = hit ? "#6fd597" : "rgba(111,213,151,.45)";
      ctx.lineWidth = 3;
      ctx.strokeRect(receiver.c * cell + 6, receiver.r * cell + 6, cell - 12, cell - 12);
      if (hit) { ctx.fillStyle = "rgba(111,213,151,.25)"; ctx.fillRect(receiver.c * cell + 6, receiver.r * cell + 6, cell - 12, cell - 12); }
    }
    // peilit
    mirrors.forEach(function (m) {
      var x = m.c * cell, y = m.r * cell;
      ctx.strokeStyle = cells[m.r + "," + m.c] ? "#dfe7f2" : "#7c8aa5";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (m.o === "/") { ctx.moveTo(x + 6, y + cell - 6); ctx.lineTo(x + cell - 6, y + 6); }
      else { ctx.moveTo(x + 6, y + 6); ctx.lineTo(x + cell - 6, y + cell - 6); }
      ctx.stroke();
    });
    return hit;
  }

  function tap(e) {
    if (done) return;
    var rect = cv.el.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    var c = Math.floor(x / cell), r = Math.floor(y / cell);
    var m = mirrorAt[r + "," + c];
    if (!m) return;
    m.o = m.o === "/" ? "\\" : "/";
    taps++;
    if (window.Audio) window.Audio.tick();
    if (draw()) {
      done = true;
      status.set("Säde osui! " + taps + " peiliä käännetty");
      if (window.Audio) window.Audio.success();
      submit("valo" + N);
    } else {
      status.set("Käännetty " + taps + " kertaa - säde ei osu vielä");
    }
  }

  g.on(cv.el, "pointerdown", tap);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  if (!gen()) { status.set("Rataa ei saatu luotua - sulje ja avaa uudelleen"); }
  indexMirrors();
  draw();
  return g.cleanup;
};
