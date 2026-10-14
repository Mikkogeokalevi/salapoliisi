// Pulmatyyppi: laser - peilipeli tasoittain.
// Napauta peileja kaantaaksesi suuntaa (/ tai \). Johdata lasersade
// lahteesta vastaanottimeen. Vaikeammilla tasoilla mukana sateenjakajia:
// jakaja paastaa sateen suoraan lapi JA heijastaa sen sivulle - sillon
// kaikki vastaanottimet (vihrea ruutu) on osuttava yhta aikaa.
// Rata generoidaan joka kerralla ja varmistetaan ratkaistavaksi.
// params: { levels: [ { size, turns, decoys } |
//                     { size, stem, branch, decoys, split:true } ] }
// guess = "rele" + tasojen maara
window.Steps["laser"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var LEVELS = P.levels || [
    { size: 7, turns: 4, decoys: 3 },
    { size: 9, turns: 6, decoys: 5 },
    { size: 11, stem: 3, branch: 2, decoys: 7, split: true }
  ];

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Ladataan...");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var wrap = document.createElement("div");
  container.appendChild(wrap);

  var li = 0, done = false, taps = 0;
  var N = 7, cell, H, cv, ctx;
  var mirrors, emitter, receivers = {}, mirrorAt = {};

  function inside(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function key(r, c) { return r + "," + c; }
  function reflect(o, dr, dc) { return o === "/" ? [-dc, -dr] : [dc, dr]; }

  function indexMirrors() {
    mirrorAt = {};
    mirrors.forEach(function (m) { mirrorAt[key(m.r, m.c)] = m; });
  }

  // Asettaa count peilia jatkaen pisteesta cur suuntaan d.
  // Palauttaa {cur,d} tai null jos ei onnistu.
  function buildLegs(count, cur, d, used, mirrorCells) {
    for (var t = 0; t < count; t++) {
      var max = 0, tr = cur[0], tc = cur[1];
      while (inside(tr + d[0], tc + d[1]) && !mirrorCells[key(tr + d[0], tc + d[1])]) {
        tr += d[0]; tc += d[1]; max++;
      }
      if (max < 3) return null;
      var s = 2 + Math.floor(Math.random() * Math.min(max - 1, 3));
      var lr = cur[0] + d[0] * s, lc = cur[1] + d[1] * s;
      if (used[key(lr, lc)]) return null;
      for (var k = 1; k <= s; k++) used[key(cur[0] + d[0] * k, cur[1] + d[1] * k)] = true;
      cur[0] = lr; cur[1] = lc;
      var perps = d[0] === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
      var opts = perps.filter(function (pd) {
        return inside(cur[0] + pd[0], cur[1] + pd[1]) &&
               inside(cur[0] + pd[0] * 2, cur[1] + pd[1] * 2) &&
               !mirrorCells[key(cur[0] + pd[0], cur[1] + pd[1])] &&
               !mirrorCells[key(cur[0] + pd[0] * 2, cur[1] + pd[1] * 2)];
      });
      if (!opts.length) return null;
      var nd = opts[Math.floor(Math.random() * opts.length)];
      var need = (nd[0] === -d[1] && nd[1] === -d[0]) ? "/" : "\\";
      mirrorCells[key(lr, lc)] = true;
      mirrors.push({ r: lr, c: lc, need: need, o: need, split: false });
      d = nd;
    }
    return { cur: cur, d: d };
  }

  // Vastaanotin sinne minne sade osuu (reuna tai peili pysayttaa).
  function endAtReceiver(cur, d, mirrorCells, used) {
    var rr = cur[0], cc = cur[1], dist = 0;
    while (true) {
      var nr = rr + d[0], nc = cc + d[1];
      if (!inside(nr, nc) || mirrorCells[key(nr, nc)]) break;
      rr = nr; cc = nc; dist++;
    }
    if (dist < 2 || used[key(rr, cc)]) return false;
    receivers[key(rr, cc)] = { r: rr, c: cc };
    used[key(rr, cc)] = true;
    return true;
  }

  // Simuloi kaikki sadehaarat. Palauttaa {hits:{key:true}, cells:{key:true}, segs:[]}
  function trace() {
    var hits = {}, cells = {}, segs = [], seen = {};
    var q = [[emitter.r, emitter.c, emitter.d[0], emitter.d[1]]];
    var guard = 0;
    while (q.length && guard++ < 400) {
      var b = q.shift();
      var r = b[0], c = b[1], dr = b[2], dc = b[3];
      var r0 = r, c0 = c;
      while (true) {
        var nr = r + dr, nc = c + dc;
        if (!inside(nr, nc)) { segs.push([r0, c0, nr, nc]); break; }
        r = nr; c = nc;
        var k = key(r, c);
        cells[k] = true;
        if (receivers[k]) { hits[k] = true; segs.push([r0, c0, r, c]); break; }
        var m = mirrorAt[k];
        if (m) {
          var sk = k + "," + dr + "," + dc;
          if (seen[sk]) { segs.push([r0, c0, r, c]); break; }
          seen[sk] = true;
          var ref = reflect(m.o, dr, dc);
          segs.push([r0, c0, r, c]);
          r0 = r; c0 = c;
          if (m.split) {
            q.push([r, c, ref[0], ref[1]]); // heijastunut haara
            // suora haara jatkaa samalla silmukalla
          } else {
            dr = ref[0]; dc = ref[1];
          }
        }
      }
    }
    return { hits: hits, cells: cells, segs: segs };
  }

  function gen() {
    var lv = LEVELS[li];
    N = lv.size;
    for (var att = 0; att < 400; att++) {
      mirrors = []; receivers = {};
      var used = {}, mirrorCells = {};
      var r = 1 + Math.floor(Math.random() * (N - 2));
      var d = [0, 1];
      emitter = { r: r, c: 0, d: d.slice() };
      used[key(r, 0)] = true;

      var stem = lv.split ? (lv.stem || 3) : (lv.turns || 4);
      var res = buildLegs(stem, [r, 0], d, used, mirrorCells);
      if (!res) continue;
      var cur = res.cur; d = res.d;

      if (!lv.split) {
        if (!endAtReceiver(cur, d, mirrorCells, used)) continue;
      } else {
        // jakaja: etene viela yksi jalka, jakaja loppuun
        var max = 0, tr = cur[0], tc = cur[1];
        while (inside(tr + d[0], tc + d[1]) && !mirrorCells[key(tr + d[0], tc + d[1])]) {
          tr += d[0]; tc += d[1]; max++;
        }
        if (max < 3) continue;
        var s = 2 + Math.floor(Math.random() * Math.min(max - 1, 3));
        var jr = cur[0] + d[0] * s, jc = cur[1] + d[1] * s;
        if (used[key(jr, jc)]) continue;
        for (var k = 1; k <= s; k++) used[key(cur[0] + d[0] * k, cur[1] + d[1] * k)] = true;
        var so = Math.random() < 0.5 ? "/" : "\\";
        var ref = reflect(so, d[0], d[1]);
        mirrors.push({ r: jr, c: jc, need: so, o: so, split: true });
        mirrorCells[key(jr, jc)] = true;

        var bA = buildLegs(lv.branch || 2, [jr, jc], d.slice(), used, mirrorCells);
        var bB = buildLegs(lv.branch || 2, [jr, jc], ref.slice(), used, mirrorCells);
        if (!bA || !bB) continue;
        if (!endAtReceiver(bA.cur, bA.d, mirrorCells, used)) continue;
        if (!endAtReceiver(bB.cur, bB.d, mirrorCells, used)) continue;
        if (Object.keys(receivers).length < 2) continue;
      }

      // Varmista ratkaistavuus: aseta ratkaisuasennot ja simuloi.
      indexMirrors();
      mirrors.forEach(function (m) { m.o = m.need; });
      var sol = trace();
      if (Object.keys(sol.hits).length !== Object.keys(receivers).length) continue;
      for (var k2 in sol.cells) used[k2] = true;

      // Sekoita nayttoasennot pois ratkaisusta.
      mirrors.forEach(function (m) { m.o = Math.random() < 0.5 ? "/" : "\\"; });

      // Haitapeilit vapaaseen tilaan (ei ratkaisupolulle).
      var empt = [];
      for (var er = 0; er < N; er++)
        for (var ec = 0; ec < N; ec++)
          if (!used[key(er, ec)]) empt.push([er, ec]);
      for (var i = 0; i < (lv.decoys || 0) && empt.length; i++) {
        var pk = empt.splice(Math.floor(Math.random() * empt.length), 1)[0];
        mirrors.push({ r: pk[0], c: pk[1], need: null, o: Math.random() < 0.5 ? "/" : "\\", split: false });
      }
      indexMirrors();

      // Jos sekoitus osui valmiiksi ratkaisuksi, vaaranna yksi peili.
      var guard = 0, total = Object.keys(receivers).length;
      while (Object.keys(trace().hits).length === total && guard++ < 12) {
        var sols = mirrors.filter(function (m) { return m.need; });
        var fl = sols[Math.floor(Math.random() * sols.length)];
        fl.o = fl.need === "/" ? "\\" : "/";
      }
      return true;
    }
    return false;
  }

  function setupCanvas() {
    wrap.innerHTML = "";
    cell = Math.floor(W / N);
    H = cell * N;
    cv = U.canvas(wrap, W, H);
    ctx = cv.ctx;
    g.on(cv.el, "pointerdown", tap);
  }

  function draw() {
    var res = trace();
    var total = Object.keys(receivers).length;
    var hitCount = Object.keys(res.hits).length;
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    // ruudukko
    ctx.strokeStyle = "rgba(40,52,76,.5)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
    }
    // sadehaarat
    ctx.strokeStyle = "rgba(232,192,90,.85)";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#e8c05a"; ctx.shadowBlur = 8;
    res.segs.forEach(function (s) {
      var x1 = s[1] * cell + cell / 2, y1 = s[0] * cell + cell / 2;
      var x2, y2;
      if (inside(s[2], s[3])) {
        x2 = s[3] * cell + cell / 2; y2 = s[2] * cell + cell / 2;
      } else {
        // sade karkaa ruudukosta -> piirra reunaan asti
        var r2 = Math.max(0, Math.min(N - 1, s[2])), c2 = Math.max(0, Math.min(N - 1, s[3]));
        x2 = c2 * cell + cell / 2 + Math.sign(s[3] - s[1]) * cell / 2;
        y2 = r2 * cell + cell / 2 + Math.sign(s[2] - s[0]) * cell / 2;
      }
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.shadowBlur = 0;
    // emitter
    ctx.fillStyle = "#5ec8e8";
    ctx.beginPath();
    ctx.moveTo(emitter.c * cell + 3, emitter.r * cell + cell / 2);
    ctx.lineTo(emitter.c * cell + cell * .55, emitter.r * cell + 4);
    ctx.lineTo(emitter.c * cell + cell * .55, emitter.r * cell + cell - 4);
    ctx.closePath(); ctx.fill();
    // vastaanottimet
    for (var rk in receivers) {
      var rc = receivers[rk];
      var got = res.hits[rk];
      ctx.strokeStyle = got ? "#6fd597" : "rgba(111,213,151,.45)";
      ctx.lineWidth = 2.5;
      var pad = Math.max(3, cell * .15);
      ctx.strokeRect(rc.c * cell + pad, rc.r * cell + pad, cell - pad * 2, cell - pad * 2);
      if (got) {
        ctx.fillStyle = "rgba(111,213,151,.3)";
        ctx.fillRect(rc.c * cell + pad, rc.r * cell + pad, cell - pad * 2, cell - pad * 2);
      }
    }
    // peilit + jakajat
    mirrors.forEach(function (m) {
      var x = m.c * cell, y = m.r * cell, p = Math.max(4, cell * .15);
      ctx.lineWidth = m.split ? 3.5 : 2.5;
      ctx.strokeStyle = res.cells[key(m.r, m.c)] ? (m.split ? "#d9a8f0" : "#dfe7f2") : (m.split ? "#8a63b8" : "#7c8aa5");
      ctx.beginPath();
      if (m.o === "/") { ctx.moveTo(x + p, y + cell - p); ctx.lineTo(x + cell - p, y + p); }
      else { ctx.moveTo(x + p, y + p); ctx.lineTo(x + cell - p, y + cell - p); }
      ctx.stroke();
      if (m.split) {
        // jakajalle pieni nelio keskelle tunnisteeksi
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(x + cell / 2 - 2.5, y + cell / 2 - 2.5, 5, 5);
      }
    });
    return hitCount === total;
  }

  function tap(e) {
    if (done) return;
    var rect = cv.el.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    var m = mirrorAt[key(Math.floor(y / cell), Math.floor(x / cell))];
    if (!m) return;
    m.o = m.o === "/" ? "\\" : "/";
    taps++;
    if (window.Audio) window.Audio.tick();
    var lv = LEVELS[li];
    var total = Object.keys(receivers).length;
    if (draw()) {
      if (li + 1 < LEVELS.length) {
        status.set("TASO " + (li + 1) + " LÄPÄISTY! Uusi rata latautuu...");
        if (window.Audio) window.Audio.click();
        li++; taps = 0;
        g.timeout(900, function () { if (!done) startLevel(); });
      } else {
        done = true;
        status.set("Kaikki tasot läpäisty - " + taps + " käännöstä viimeisellä");
        if (window.Audio) window.Audio.success();
        submit("rele" + LEVELS.length);
      }
    } else {
      status.set("TASO " + (li + 1) + "/" + LEVELS.length + " · " + taps + " käännöstä");
    }
  }

  function startLevel() {
    if (!gen()) { status.set("Rataa ei saatu luotua - sulje ja avaa uudelleen"); return; }
    setupCanvas();
    var lv = LEVELS[li];
    status.set("TASO " + (li + 1) + " / " + LEVELS.length +
      (lv.split ? " · johdata säde MOLEMPIIN maaleihin" : " - johdata säde maaliin"));
    draw();
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);

  startLevel();
  return g.cleanup;
};
