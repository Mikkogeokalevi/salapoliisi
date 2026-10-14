// Pulmatyyppi: laser - peilipeli, 5 tasoa.
// Napauta peileja kaantaaksesi suuntaa (/ tai \). Johdata lasersade
// lahteesta vastaanottimeen. Vaikeammilla tasoilla:
//   - sateenjakajat (violetti): sade jatkaa suoraan JA heijastuu sivulle
//   - kiinteet peilit (tummat): eivat kaanny, ohitettava muilla peileilla
//   - esteet (seinat): sade pysahtyy, ei voi kulkea lapi
//   - varilliset vastaanottimet + suotimet: sade on varjattava oikein
// Rata generoidaan joka kerralla ja varmistetaan ratkaistavaksi.
// params: { levels: [ {size,turns,decoys,fixed,walls}
//          | {size,stem,branch,decoys,fixed,walls,split:true,colored:true} ] }
// guess = "rele" + tasojen maara
window.Steps["laser"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var P = step.params || {};
  var LEVELS = P.levels || [
    { size: 9,  turns: 6, decoys: 5, walls: 4, fixed: 2 },
    { size: 11, turns: 8, decoys: 7, walls: 6, fixed: 3 },
    { size: 11, stem: 4, branch: 3, decoys: 8, split: true, walls: 5, fixed: 2 },
    { size: 13, stem: 4, branch: 3, decoys: 9, split: true, walls: 7, fixed: 3 },
    { size: 13, stem: 4, branch: 3, decoys: 9, split: true, walls: 7, fixed: 3, colored: true },
    { size: 15, stem: 4, branch: 3, decoys: 11, split: true, walls: 9, fixed: 4, colored: true },
    { size: 15, stem: 3, branch: 2, decoys: 11, split2: true, walls: 10, fixed: 5, colored: true }
  ];
  var FCYCLE = ["r", "g", "b"];
  var CMAP = { w: "#e8c05a", r: "#e05555", g: "#6fd597", b: "#5ec8e8" };

  U.prompt(container, step.prompt);
  var g = U.game();
  var status = U.statusLine(container, "Ladataan...");

  var W = Math.min(360, Math.floor(window.innerWidth * 0.88));
  var wrap = document.createElement("div");
  container.appendChild(wrap);

  var li = 0, done = false, taps = 0;
  var N = 7, cell, H, cv, ctx;
  var mirrors, walls, emitter, receivers, mirrorAt;

  function inside(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
  function key(r, c) { return r + "," + c; }
  function reflect(o, dr, dc) { return o === "/" ? [-dc, -dr] : [dc, dr]; }

  function indexMirrors() {
    mirrorAt = {};
    mirrors.forEach(function (m) { mirrorAt[key(m.r, m.c)] = m; });
  }

  // count peilia jatkaen pisteesta cur suuntaan d. blocked = {seinat + peilit}.
  function buildLegs(count, cur, d, used, blocked) {
    var cellsOut = [];
    for (var t = 0; t < count; t++) {
      var max = 0, tr = cur[0], tc = cur[1];
      while (inside(tr + d[0], tc + d[1]) && !blocked[key(tr + d[0], tc + d[1])]) {
        tr += d[0]; tc += d[1]; max++;
      }
      if (max < 3) return null;
      // valit jopa 5 askelta -> rata levittaytyy isommalle alueelle
      var s = 2 + Math.floor(Math.random() * Math.min(max - 1, 4));
      var lr = cur[0] + d[0] * s, lc = cur[1] + d[1] * s;
      if (used[key(lr, lc)] || blocked[key(lr, lc)]) return null;
      for (var k = 1; k <= s; k++) {
        used[key(cur[0] + d[0] * k, cur[1] + d[1] * k)] = true;
        cellsOut.push(key(cur[0] + d[0] * k, cur[1] + d[1] * k));
      }
      cur[0] = lr; cur[1] = lc;
      var perps = d[0] === 0 ? [[-1, 0], [1, 0]] : [[0, -1], [0, 1]];
      var opts = perps.filter(function (pd) {
        var n1 = key(cur[0] + pd[0], cur[1] + pd[1]);
        var n2 = key(cur[0] + pd[0] * 2, cur[1] + pd[1] * 2);
        return inside(cur[0] + pd[0], cur[1] + pd[1]) &&
               inside(cur[0] + pd[0] * 2, cur[1] + pd[1] * 2) &&
               !blocked[n1] && !blocked[n2];
      });
      if (!opts.length) return null;
      var nd = opts[Math.floor(Math.random() * opts.length)];
      var need = (nd[0] === -d[1] && nd[1] === -d[0]) ? "/" : "\\";
      blocked[key(lr, lc)] = true;
      mirrors.push({ r: lr, c: lc, need: need, o: need, split: false, fixed: false, filter: false });
      d = nd;
    }
    return { cur: cur, d: d, cells: cellsOut };
  }

  // Aseta sateenjakaja jalan loppuun: palauttaa {jr,jc,straight,ref} tai null.
  function placeSplitter(cur, d, used, blocked) {
    var max = 0, tr = cur[0], tc = cur[1];
    while (inside(tr + d[0], tc + d[1]) && !blocked[key(tr + d[0], tc + d[1])]) {
      tr += d[0]; tc += d[1]; max++;
    }
    if (max < 3) return null;
    var s = 2 + Math.floor(Math.random() * Math.min(max - 1, 4));
    var jr = cur[0] + d[0] * s, jc = cur[1] + d[1] * s;
    if (used[key(jr, jc)] || blocked[key(jr, jc)]) return null;
    for (var k = 1; k <= s; k++) used[key(cur[0] + d[0] * k, cur[1] + d[1] * k)] = true;
    var so = Math.random() < 0.5 ? "/" : "\\";
    var ref = reflect(so, d[0], d[1]);
    mirrors.push({ r: jr, c: jc, need: so, o: so, split: true, fixed: false, filter: false });
    blocked[key(jr, jc)] = true;
    return { jr: jr, jc: jc, straight: d.slice(), ref: ref };
  }

  // Vastaanotin sinne minne sade osuu. color='w' = neutraali.
  function endAtReceiver(cur, d, blocked, used, color) {
    var rr = cur[0], cc = cur[1], dist = 0, cellsOut = [];
    while (true) {
      var nr = rr + d[0], nc = cc + d[1];
      if (!inside(nr, nc) || blocked[key(nr, nc)]) break;
      rr = nr; cc = nc; cellsOut.push(key(nr, nc)); dist++;
    }
    if (dist < 2 || used[key(rr, cc)]) return null;
    receivers[key(rr, cc)] = { r: rr, c: cc, color: color || "w" };
    used[key(rr, cc)] = true;
    return cellsOut;
  }

  // Simuloi sadehaarat. Palauttaa {hits, cells, segs, hitCells}
  // hits[rk]=true kun vastaanotin osui OIKEALLA varilla.
  function trace() {
    var hits = {}, cells = {}, segs = [], seen = {}, hitCells = {};
    var q = [[emitter.r, emitter.c, emitter.d[0], emitter.d[1], "w", [key(emitter.r, emitter.c)]]];
    var guard = 0;
    while (q.length && guard++ < 300) {
      var b = q.shift();
      var r = b[0], c = b[1], dr = b[2], dc = b[3], col = b[4], path = b[5];
      var r0 = r, c0 = c;
      while (true) {
        var nr = r + dr, nc = c + dc;
        if (!inside(nr, nc)) { segs.push([r0, c0, nr, nc, col]); break; }
        r = nr; c = nc;
        var k = key(r, c);
        cells[k] = true; path.push(k);
        if (walls[k]) { segs.push([r0, c0, r, c, col]); break; }
        if (receivers[k]) {
          segs.push([r0, c0, r, c, col]);
          if (!hitCells[k]) hitCells[k] = path; // polku osuneelle (vari ratkaisee osuman)
          if (receivers[k].color === "w" || receivers[k].color === col) hits[k] = true;
          break;
        }
        var m = mirrorAt[k];
        if (m && m.filter) {
          col = m.o; // suodatin variaba sateen
          continue;
        }
        if (m) {
          var sk = k + "," + dr + "," + dc + "," + col;
          if (seen[sk]) { segs.push([r0, c0, r, c, col]); break; }
          seen[sk] = true;
          var ref = reflect(m.o, dr, dc);
          segs.push([r0, c0, r, c, col]);
          r0 = r; c0 = c;
          if (m.split) q.push([r, c, ref[0], ref[1], col, path.slice()]);
          else { dr = ref[0]; dc = ref[1]; }
        }
      }
    }
    return { hits: hits, cells: cells, segs: segs, hitCells: hitCells };
  }

  function gen() {
    var lv = LEVELS[li];
    N = lv.size;
    for (var att = 0; att < 1000; att++) {
      mirrors = []; receivers = {}; walls = {};
      var used = {};
      var blocked = {}; // seinat + peilit + jakajat (ei suotimia)
      var r = 1 + Math.floor(Math.random() * (N - 2));
      var d = [0, 1];
      emitter = { r: r, c: 0, d: d.slice() };
      used[key(r, 0)] = true;

      // seinat ensin: sade ei kulje lapi
      var wn = lv.walls || 0;
      for (var wi = 0; wi < wn * 6 && wn; wi++) {
        if (Object.keys(walls).length >= wn) break;
        var wr = Math.floor(Math.random() * N), wc = 1 + Math.floor(Math.random() * (N - 1));
        var wk = key(wr, wc);
        if (used[wk] || blocked[wk]) continue;
        walls[wk] = { r: wr, c: wc };
        blocked[wk] = true; used[wk] = true;
      }

      var stem = (lv.split || lv.split2) ? (lv.stem || 3) : (lv.turns || 4);
      var res = buildLegs(stem, [r, 0], d, used, blocked);
      if (!res) continue;
      var cur = res.cur; d = res.d;

      var colorQueue = lv.colored ? FCYCLE.slice() : null;
      function nextColor() { return colorQueue && colorQueue.length ? colorQueue.shift() : "w"; }

      if (!lv.split && !lv.split2) {
        if (!endAtReceiver(cur, d, blocked, used, nextColor())) continue;
      } else if (lv.split2) {
        // kaksi jakajaa: toinen haara jakautuu edelleen -> 3 maalia
        var sp1 = placeSplitter(cur, d, used, blocked);
        if (!sp1) continue;
        var hA = buildLegs(lv.branch || 2, [sp1.jr, sp1.jc], sp1.straight, used, blocked);
        var hB = buildLegs(lv.branch || 2, [sp1.jr, sp1.jc], sp1.ref, used, blocked);
        if (!hA || !hB) continue;
        var sp2 = placeSplitter(hA.cur, hA.d, used, blocked);
        if (!sp2) continue;
        var hA1 = buildLegs(lv.branch || 2, [sp2.jr, sp2.jc], sp2.straight, used, blocked);
        var hA2 = buildLegs(lv.branch || 2, [sp2.jr, sp2.jc], sp2.ref, used, blocked);
        if (!hA1 || !hA2) continue;
        if (!endAtReceiver(hA1.cur, hA1.d, blocked, used, nextColor())) continue;
        if (!endAtReceiver(hA2.cur, hA2.d, blocked, used, nextColor())) continue;
        if (!endAtReceiver(hB.cur, hB.d, blocked, used, nextColor())) continue;
        if (Object.keys(receivers).length < 3) continue;
      } else {
        var sp = placeSplitter(cur, d, used, blocked);
        if (!sp) continue;
        var bA = buildLegs(lv.branch || 2, [sp.jr, sp.jc], sp.straight, used, blocked);
        var bB = buildLegs(lv.branch || 2, [sp.jr, sp.jc], sp.ref, used, blocked);
        if (!bA || !bB) continue;
        if (!endAtReceiver(bA.cur, bA.d, blocked, used, nextColor())) continue;
        if (!endAtReceiver(bB.cur, bB.d, blocked, used, nextColor())) continue;
        if (Object.keys(receivers).length < 2) continue;
      }

      // Varmista ratkaistavuus: aseta ratkaisuasennot ja simuloi.
      indexMirrors();
      mirrors.forEach(function (m) { m.o = m.need; });
      var sol = trace();
      var total = Object.keys(receivers).length;
      // varittomalla tasolla: hits ratkaisee. varillisella: tavoittavuus ratkaisee
      // (suotimet asetetaan vasta nyt - varisokea tarkistus ensin).
      var reachable = Object.keys(sol.hitCells).length === total;
      if (!reachable || (!lv.colored && Object.keys(sol.hits).length !== total)) continue;
      // vaadi etta polku levittyy ruudukolle (ei triviaalia suoraa ratkaisua)
      if (Object.keys(sol.cells).length < N * 2.2) continue;

      // Varilliset vastaanottimet: suodatin kunkin osuvan sateen polulle.
      // Suosi soluja jotka kuuluvat VAIN kyseisen sateen polkuun.
      if (lv.colored) {
        var okF = true;
        for (var rk in receivers) {
          var rc = receivers[rk];
          var others = {};
          for (var ok2 in sol.hitCells) {
            if (ok2 === rk) continue;
            sol.hitCells[ok2].forEach(function (ck) { others[ck] = true; });
          }
          var own = sol.hitCells[rk].filter(function (ck) {
            return !blocked[ck] && !receivers[ck] && !others[ck];
          });
          var cand = own.length ? own : sol.hitCells[rk].filter(function (ck) {
            return !blocked[ck] && !receivers[ck];
          });
          if (!cand.length) { okF = false; break; }
          var fk = cand[Math.floor(Math.random() * cand.length)];
          var fr = +fk.split(",")[0], fc = +fk.split(",")[1];
          mirrors.push({ r: fr, c: fc, need: rc.color, o: rc.color, split: false, fixed: false, filter: true });
          used[fk] = true;
        }
        if (!okF) continue;
        // suotimet paikallaan -> varmista etta varit myos osuvat
        indexMirrors();
        sol = trace();
        if (Object.keys(sol.hits).length !== total) continue;
      }
      for (var k2 in sol.cells) used[k2] = true;

      // Sekoita nayttoasennot pois ratkaisusta.
      mirrors.forEach(function (m) {
        if (m.filter) {
          var others = FCYCLE.filter(function (x) { return x !== m.need; });
          m.o = others[Math.floor(Math.random() * others.length)];
        } else {
          m.o = Math.random() < 0.5 ? "/" : "\\";
        }
      });

      // Kiinteet peilit + haittapeilit vapaaseen tilaan.
      var empt = [];
      for (var er = 0; er < N; er++)
        for (var ec = 0; ec < N; ec++)
          if (!used[key(er, ec)]) empt.push([er, ec]);
      function scatter(count, fixedFlag) {
        for (var i = 0; i < count && empt.length; i++) {
          var pk = empt.splice(Math.floor(Math.random() * empt.length), 1)[0];
          mirrors.push({ r: pk[0], c: pk[1], need: null,
            o: Math.random() < 0.5 ? "/" : "\\",
            split: false, fixed: fixedFlag, filter: false });
        }
      }
      scatter(lv.fixed || 0, true);
      scatter(lv.decoys || 0, false);
      indexMirrors();

      // Jos sekoitus osui valmiiksi ratkaisuksi, vaaranna yksi palanen.
      var guard = 0;
      while (Object.keys(trace().hits).length === total && guard++ < 15) {
        var sols = mirrors.filter(function (m) { return m.need && !m.fixed; });
        if (!sols.length) break;
        var fl = sols[Math.floor(Math.random() * sols.length)];
        if (fl.filter) {
          var oth = FCYCLE.filter(function (x) { return x !== fl.need; });
          fl.o = oth[Math.floor(Math.random() * oth.length)];
        } else {
          fl.o = fl.need === "/" ? "\\" : "/";
        }
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
    ctx.fillStyle = "#05080e";
    ctx.fillRect(0, 0, W, H);
    // ruudukko
    ctx.strokeStyle = "rgba(40,52,76,.5)";
    ctx.lineWidth = 1;
    for (var i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(W, i * cell); ctx.stroke();
    }
    // seinat
    for (var wk in walls) {
      var wc2 = walls[wk];
      ctx.fillStyle = "#1c2333";
      ctx.fillRect(wc2.c * cell + 1, wc2.r * cell + 1, cell - 2, cell - 2);
      ctx.strokeStyle = "#2e3b55";
      ctx.strokeRect(wc2.c * cell + 1.5, wc2.r * cell + 1.5, cell - 3, cell - 3);
    }
    // sadehaarat (varit)
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    res.segs.forEach(function (s) {
      var col = CMAP[s[4]] || CMAP.w;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      var x1 = s[1] * cell + cell / 2, y1 = s[0] * cell + cell / 2;
      var x2, y2;
      if (inside(s[2], s[3])) {
        x2 = s[3] * cell + cell / 2; y2 = s[2] * cell + cell / 2;
      } else {
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
    // vastaanottimet (varilliset)
    for (var rk in receivers) {
      var rc = receivers[rk];
      var got = res.hits[rk];
      var col2 = rc.color === "w" ? "#6fd597" : CMAP[rc.color];
      ctx.strokeStyle = got ? col2 : col2 + "88";
      ctx.lineWidth = 2.5;
      var pad = Math.max(3, cell * .15);
      ctx.strokeRect(rc.c * cell + pad, rc.r * cell + pad, cell - pad * 2, cell - pad * 2);
      if (got) {
        ctx.fillStyle = col2 + "44";
        ctx.fillRect(rc.c * cell + pad, rc.r * cell + pad, cell - pad * 2, cell - pad * 2);
      }
    }
    // peilit, jakajat, suotimet
    mirrors.forEach(function (m) {
      var x = m.c * cell, y = m.r * cell, p = Math.max(4, cell * .15);
      var lit = res.cells[key(m.r, m.c)];
      if (m.filter) {
        // suodatin: vinoneliö, värillinen, sykkivä + valkoinen kehys (napautettava)
        var pulse = 1 + 0.09 * Math.sin(Date.now() / 350 + (m.r * 1.3 + m.c * 0.7));
        var half = (cell / 2 - p) * pulse;
        var cx = x + cell / 2, cy = y + cell / 2;
        ctx.fillStyle = CMAP[m.o];
        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - half);
        ctx.lineTo(cx + half, cy);
        ctx.lineTo(cx, cy + half);
        ctx.lineTo(cx - half, cy);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        return;
      }
      ctx.lineWidth = m.split ? 3.5 : 2.5;
      if (m.fixed) ctx.strokeStyle = "#4a5468";
      else ctx.strokeStyle = lit ? (m.split ? "#d9a8f0" : "#dfe7f2") : (m.split ? "#8a63b8" : "#7c8aa5");
      ctx.beginPath();
      if (m.o === "/") { ctx.moveTo(x + p, y + cell - p); ctx.lineTo(x + cell - p, y + p); }
      else { ctx.moveTo(x + p, y + p); ctx.lineTo(x + cell - p, y + cell - p); }
      ctx.stroke();
      if (m.split) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.fillRect(x + cell / 2 - 2.5, y + cell / 2 - 2.5, 5, 5);
      } else if (m.fixed) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold " + Math.floor(cell * .45) + "px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("×", x + cell / 2, y + cell / 2);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      }
    });
    return res.hits;
  }

  function tap(e) {
    if (done) return;
    var rect = cv.el.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    var m = mirrorAt[key(Math.floor(y / cell), Math.floor(x / cell))];
    if (!m || m.fixed) {
      if (m && m.fixed) status.set("TASO " + (li + 1) + "/" + LEVELS.length + " · kiinteä peili ei käänny");
      return;
    }
    if (m.filter) {
      var idx = (FCYCLE.indexOf(m.o) + 1) % FCYCLE.length;
      m.o = FCYCLE[idx];
    } else {
      m.o = m.o === "/" ? "\\" : "/";
    }
    taps++;
    if (window.Audio) window.Audio.tick();
    var hits = draw();
    var total = Object.keys(receivers).length;
    if (Object.keys(hits).length === total) {
      if (li + 1 < LEVELS.length) {
        status.set("TASO " + (li + 1) + " LÄPÄISTY! Uusi rata latautuu...");
        if (window.Audio) window.Audio.click();
        li++; taps = 0;
        g.timeout(900, function () { if (!done) startLevel(); });
      } else {
        done = true;
        status.set("Kaikki " + LEVELS.length + " tasoa läpäisty!");
        if (window.Audio) window.Audio.success();
        submit("rele" + LEVELS.length);
      }
    } else {
      var got = Object.keys(hits).length;
      status.set("TASO " + (li + 1) + "/" + LEVELS.length + " · " + taps + " käännöstä" +
        (total > 1 ? " · maaleja " + got + "/" + total : ""));
    }
  }

  function startLevel() {
    if (!gen()) { status.set("Rataa ei saatu luotua - sulje ja avaa uudelleen"); return; }
    setupCanvas();
    var lv = LEVELS[li];
    status.set("TASO " + (li + 1) + " / " + LEVELS.length +
      ((lv.split || lv.split2) ? " · jakaja: kaikki maalit osuttava" : " - johdata säde maaliin") +
      (lv.colored ? " · värit!" : ""));
    draw();
  }

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.hint(container, api);
  U.button(container, "Arpoo uuden radan", function () {
    if (done) return;
    taps = 0;
    startLevel();
  });

  startLevel();
  // suotimien sykintä: piirretään jatkuvasti
  (function anim() { if (!done) { draw(); g.raf(anim); } })();
  return g.cleanup;
};
