// Salapoliisi - sessions.js: pelaajasessioiden tarkastelu
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  function db() { return window.fb.db; }

  var allSessions = [];
  var wrongAgg = {}; // step -> {value: count}

  window.fb.auth.onAuthStateChanged(function (user) {
    if (user && window.fb.isAdmin(user)) {
      $("login-view").style.display = "none";
      $("sess-view").style.display = "block";
      loadSessions();
    } else {
      $("sess-view").style.display = "none";
      $("login-view").style.display = "block";
      if (user && !user.isAnonymous) window.fb.signOut();
    }
  });

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    window.fb.signInAdmin($("l-email").value.trim(), $("l-pass").value)
      .catch(function (err) {
        $("login-error").textContent = "Kirjautuminen epaonnistui: " + err.message;
        $("login-error").style.display = "block";
      });
  });

  $("btn-logout").addEventListener("click", function (e) {
    e.preventDefault();
    window.fb.signOut();
  });

  $("btn-refresh").addEventListener("click", function (e) {
    e.preventDefault();
    loadSessions();
  });

  $("f-nick").addEventListener("input", render);
  $("f-status").addEventListener("change", render);

  // Välilehdet
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.remove("on"); });
      t.classList.add("on");
      ["tab-sess", "tab-finals", "tab-wrong"].forEach(function (id) {
        $(id).style.display = id === t.dataset.tab ? "block" : "none";
      });
    });
  });

  function fmtTs(ts) {
    if (!ts || !ts.toDate) return "-";
    var d = ts.toDate();
    return d.toLocaleDateString("fi-FI") + " " +
      d.toLocaleTimeString("fi-FI", { hour: "2-digit", minute: "2-digit" });
  }

  function loadSessions() {
    db().collection("sessions")
      .orderBy("lastActiveAt", "desc").limit(200).get()
      .then(function (qs) {
        allSessions = qs.docs.map(function (d) {
          return Object.assign({ uid: d.id }, d.data());
        });
        $("n-sess").textContent = allSessions.length || "";
        wrongAgg = {};
        return Promise.all(allSessions.map(function (s) {
          return db().collection("sessions").doc(s.uid)
            .collection("wrongAnswers").get().then(function (wq) {
              s._wrongCount = wq.size;
              wq.docs.forEach(function (d) {
                var w = d.data();
                if (!wrongAgg[w.step]) wrongAgg[w.step] = {};
                var key = w.value || "?";
                wrongAgg[w.step][key] = (wrongAgg[w.step][key] || 0) + 1;
              });
            }).catch(function () { s._wrongCount = 0; });
        }));
      }).then(function () {
        render();
        renderAgg();
        loadFinals();
      }).catch(function (e) {
        $("sess-table").querySelector("tbody").innerHTML =
          '<tr><td colspan="6"><div class="notice err">Lataus epaonnistui: ' +
          e.message + "</div></td></tr>";
      });
  }

  function render() {
    var nick = $("f-nick").value.trim().toLowerCase();
    var st = $("f-status").value;
    var tb = $("sess-table").querySelector("tbody");
    tb.innerHTML = "";
    allSessions.filter(function (s) {
      if (nick && !(s.nickname || "").toLowerCase().includes(nick)) return false;
      if (st === "done" && !s.completed) return false;
      if (st === "open" && s.completed) return false;
      return true;
    }).forEach(function (s) {
      var tr = document.createElement("tr");
      var hints = s.hintsUsed
        ? Object.keys(s.hintsUsed).reduce(function (a, k) { return a + s.hintsUsed[k]; }, 0)
        : 0;
      tr.innerHTML =
        "<td><b>" + (s.nickname || "?") + "</b></td>" +
        "<td>" + (s.currentStep || 0) + "/" + (s.stepsTotal || "?") +
          " <span class='muted'>(" + (s._wrongCount || 0) + " vaaraa)</span></td>" +
        "<td>" + hints + "</td>" +
        "<td class='muted'>" + fmtTs(s.createdAt) + "</td>" +
        "<td>" + (s.completed
          ? '<span class="badge ok">VALMIS</span>'
          : '<span class="badge">KESKEN</span>') + "</td>" +
        '<td><button class="btn ghost" style="min-height:30px;padding:.15rem .7rem">Nayta</button> ' +
        '<button class="btn danger" style="min-height:30px;padding:.15rem .7rem">Poista</button></td>';
      var btns = tr.querySelectorAll("button");
      btns[0].addEventListener("click", function () { showDetail(s); });
      btns[1].addEventListener("click", function () {
        if (confirm("Poistetaan sessio " + (s.nickname || s.uid) + "?")) deleteSession(s);
      });
      tb.appendChild(tr);
    });
  }

  function showDetail(s) {
    $("detail").style.display = "block";
    $("detail-title").textContent = "Sessio: " + (s.nickname || s.uid);
    var body = $("detail-body");
    body.innerHTML = '<div class="muted">Ladataan vääriä vastauksia...</div>';
    db().collection("sessions").doc(s.uid).collection("wrongAnswers")
      .orderBy("at", "desc").get()
      .then(function (qs) {
        if (qs.empty) {
          body.innerHTML = '<div class="notice">Ei vääriä vastauksia.</div>';
          return;
        }
        var html = '<table class="data"><thead><tr><th>Vaihe</th><th>Arvaus</th><th>Aika</th></tr></thead><tbody>';
        qs.docs.forEach(function (d) {
          var w = d.data();
          html += "<tr><td>" + w.step + "</td><td class='mono'>" +
            (w.value || "") + "</td><td class='muted'>" + fmtTs(w.at) + "</td></tr>";
        });
        body.innerHTML = html + "</tbody></table>";
      });
    $("detail").scrollIntoView({ behavior: "smooth" });
  }

  // --- Ratkaisseet (solved.*_final) ----------------------------------
  function fmtDur(ms) {
    if (!ms || ms < 0) return "-";
    var m = Math.round(ms / 60000);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60);
    return h + " h " + (m % 60) + " min";
  }

  function loadFinals() {
    var tb = $("finals-table").querySelector("tbody");
    // Haetaan kaikki ja suodatetaan selaimessa - ei indeksivaatimusta
    db().collection("solved").get()
      .then(function (qs) {
        var rows = qs.docs.map(function (d) { return d.data(); })
          .filter(function (r) { return r.step === "final"; })
          .sort(function (a, b) {
            return (a.at ? a.at.toMillis() : 0) - (b.at ? b.at.toMillis() : 0);
          });
        $("n-finals").textContent = rows.length || "";
        if (!rows.length) {
          tb.innerHTML = '<tr><td colspan="5" class="muted">Ei vielä ratkaisijoita.</td></tr>';
          return;
        }
        tb.innerHTML = "";
        var byUid = {};
        allSessions.forEach(function (s) { byUid[s.uid] = s; });
        rows.forEach(function (r, i) {
          var r = d.data();
          var sess = byUid[r.uid] || {};
          var tr = document.createElement("tr");
          var dur = (r.at && sess.createdAt)
            ? fmtDur(r.at.toMillis() - sess.createdAt.toMillis()) : "-";
          tr.innerHTML =
            "<td>" + (i + 1) + "</td>" +
            "<td><b>" + (sess.nickname || r.uid.slice(0, 8) + "…") + "</b></td>" +
            "<td class='muted'>" + fmtTs(r.at) + "</td>" +
            "<td class='muted'>" + fmtTs(sess.createdAt) + "</td>" +
            "<td>" + dur + "</td>";
          tb.appendChild(tr);
        });
      })
      .catch(function (e) {
        tb.innerHTML = '<tr><td colspan="5"><div class="notice err">' +
          "Lataus epäonnistui: " + e.message + "</div></td></tr>";
      });
  }

  function renderAgg() {
    var el = $("agg");
    var keys = Object.keys(wrongAgg).sort();
    if (!keys.length) {
      el.innerHTML = '<span class="muted">Ei vääriä vastauksia.</span>';
      return;
    }
    var html = "";
    keys.forEach(function (step) {
      html += "<div style='margin-bottom:.8rem'><b class='mono'>" + step + "</b><br>";
      var vals = Object.keys(wrongAgg[step])
        .map(function (v) { return { v: v, n: wrongAgg[step][v] }; })
        .sort(function (a, b) { return b.n - a.n; })
        .slice(0, 5);
      vals.forEach(function (x) {
        html += '<span class="badge err" style="margin:.2rem .3rem 0 0">' +
          x.v + " × " + x.n + "</span>";
      });
      html += "</div>";
    });
    el.innerHTML = html;
  }

  function deleteSession(s) {
    db().collection("sessions").doc(s.uid)
      .collection("wrongAnswers").get()
      .then(function (qs) {
        var b = db().batch();
        qs.docs.forEach(function (d) { b.delete(d.ref); });
        b.delete(db().collection("sessions").doc(s.uid));
        return b.commit();
      })
      .then(loadSessions)
      .catch(function (e) { alert("Poisto epaonnistui: " + e.message); });
  }
})();
