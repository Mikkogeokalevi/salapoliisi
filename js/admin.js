// Salapoliisi - admin.js: hallintapaneelin logiikka
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  function db() { return window.fb.db; }
  function norm(s) {
    return String(s == null ? "" : s).trim().toLowerCase().replace(/\s+/g, " ");
  }

  var stepsCache = {}; // id -> data

  function msg(text, isErr) {
    $("admin-msg").innerHTML =
      '<div class="notice ' + (isErr ? "err" : "ok") + '">' + text + "</div>";
    setTimeout(function () { $("admin-msg").innerHTML = ""; }, 5000);
  }

  // --- Auth -------------------------------------------------------
  window.fb.auth.onAuthStateChanged(function (user) {
    if (user && window.fb.isAdmin(user)) {
      $("login-view").style.display = "none";
      $("admin-view").style.display = "block";
      loadAll();
    } else {
      $("admin-view").style.display = "none";
      $("login-view").style.display = "block";
      if (user && !user.isAnonymous) {
        $("login-error").textContent = "Talla tililla ei ole admin-oikeuksia.";
        $("login-error").style.display = "block";
        window.fb.signOut();
      }
    }
  });

  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var email = $("l-email").value.trim();
    var pass = $("l-pass").value;
    $("login-error").style.display = "none";
    window.fb.signInAdmin(email, pass).catch(function (err) {
      $("login-error").textContent = "Kirjautuminen epaonnistui: " + err.message;
      $("login-error").style.display = "block";
    });
  });

  $("btn-logout").addEventListener("click", function (e) {
    e.preventDefault();
    window.fb.signOut();
  });

  // --- Lataus -----------------------------------------------------
  function loadAll() {
    db().collection("config").doc("game").get().then(function (d) {
      var c = d.exists ? d.data() : {};
      $("cfg-initialPrompt").value = c.initialPrompt || "";
      $("cfg-finalMessage").value = c.finalMessage || "";
    }).catch(function () {});

    // Loppukoodi solutions/final -dokumentista
    db().collection("solutions").doc("final").get().then(function (d) {
      $("cfg-finalCode").value = (d.exists && d.data().answers)
        ? d.data().answers.join("\n") : "";
    }).catch(function () {});

    db().collection("steps").get().then(function (qs) {
      var docs = qs.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      }).sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      stepsCache = {};
      docs.forEach(function (s) { stepsCache[s.id] = s; });
      renderSteps(docs);
    });
  }

  function renderSteps(docs) {
    var tb = $("steps-table").querySelector("tbody");
    tb.innerHTML = "";
    docs.forEach(function (s) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" + (s.order || "") + "</td>" +
        "<td>" + (s.title || s.id) + "</td>" +
        '<td><span class="badge">' + s.type + "</span></td>" +
        '<td class="muted">…</td>' +
        '<td class="mono">…</td>' +
        '<td><button class="btn ghost btn-test" style="min-height:32px;padding:.2rem .8rem">Testaa</button></td>' +
        '<td><button class="btn ghost" style="min-height:32px;padding:.2rem .8rem">Muokkaa</button></td>';
      // Lataa vastaus+koodinpala pieninana (admin-luku sallittu)
      db().collection("solutions").doc(s.id).get().then(function (d) {
        tr.children[3].textContent = d.exists ? (d.data().answers || []).join(", ") : "-";
      });
      db().collection("rewards").doc(s.id).get().then(function (d) {
        tr.children[4].textContent = d.exists ? (d.data().codePart || "-") : "-";
      });
      tr.querySelector(".btn-test").addEventListener("click", function () {
        previewStep(s);
      });
      tr.querySelectorAll("button")[1].addEventListener("click", function () {
        openEditor(s);
      });
      tb.appendChild(tr);
    });
  }

  // --- Vaihe-editori ----------------------------------------------
  function openEditor(s) {
    $("step-editor").style.display = "block";
    $("se-heading").textContent = "Muokkaa: " + s.id;
    $("se-id").value = s.id;
    $("se-order").value = s.order || 0;
    $("se-type").value = s.type || "text";
    $("se-title").value = s.title || "";
    $("se-promptShort").value = s.promptShort || "";
    $("se-story").value = (s.story || []).join("\n");
    $("se-prompt").value = s.prompt || "";
    $("se-params").value = JSON.stringify(s.params || {}, null, 2);
    $("se-hints").value = (s.hints || []).join("\n");
    $("se-answers").value = "";
    $("se-codePart").value = "";
    $("se-reveal").value = "";
    db().collection("solutions").doc(s.id).get().then(function (d) {
      if (d.exists) $("se-answers").value = (d.data().answers || []).join("\n");
    });
    db().collection("rewards").doc(s.id).get().then(function (d) {
      if (d.exists) {
        $("se-codePart").value = d.data().codePart || "";
        $("se-reveal").value = d.data().revealText || "";
      }
    });
    $("step-editor").scrollIntoView({ behavior: "smooth" });
  }

  $("btn-add-step").addEventListener("click", function () {
    // Automaattinen seuraava ID: step_NN
    var max = 0;
    Object.keys(stepsCache).forEach(function (id) {
      var m = id.match(/step_(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var id = "step_" + String(max + 1).padStart(2, "0");
    openEditor({ id: id, order: max + 1 });
    $("se-heading").textContent = "Uusi vaihe: " + id;
  });

  $("se-cancel").addEventListener("click", function () {
    $("step-editor").style.display = "none";
  });

  $("se-save").addEventListener("click", function () {
    var id = $("se-id").value.trim();
    if (!id) return msg("ID puuttuu.", true);
    var params;
    try { params = JSON.parse($("se-params").value || "{}"); }
    catch (e) { return msg("Params ei ole kelvollinen JSON.", true); }

    var stepData = {
      order: parseInt($("se-order").value, 10) || 0,
      type: $("se-type").value,
      title: $("se-title").value,
      promptShort: $("se-promptShort").value,
      story: $("se-story").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean),
      prompt: $("se-prompt").value,
      params: params,
      hints: $("se-hints").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
    };
    var answers = $("se-answers").value.split("\n").map(norm).filter(Boolean);
    var reward = {
      codePart: $("se-codePart").value,
      revealText: $("se-reveal").value
    };

    Promise.all([
      db().collection("steps").doc(id).set(stepData),
      db().collection("solutions").doc(id).set({ answers: answers }),
      db().collection("rewards").doc(id).set(reward)
    ]).then(function () {
      msg("Vaihe " + id + " tallennettu (steps + solutions + rewards).");
      $("step-editor").style.display = "none";
      loadAll();
    }).catch(function (e) { msg("Virhe: " + e.message, true); });
  });

  $("se-delete").addEventListener("click", function () {
    var id = $("se-id").value.trim();
    if (!id || !confirm("Poistetaanko vaihe " + id + " (steps+solutions+rewards)?")) return;
    Promise.all([
      db().collection("steps").doc(id).delete(),
      db().collection("solutions").doc(id).delete(),
      db().collection("rewards").doc(id).delete()
    ]).then(function () {
      msg("Vaihe poistettu.");
      $("step-editor").style.display = "none";
      loadAll();
    }).catch(function (e) { msg("Virhe: " + e.message, true); });
  });

  // --- Peliesikatselu -------------------------------------------------
  // Avaa vaiheen samaan sheet-nakyman kuin pelissa. Kayttaa mock-apia:
  // vastauksia ei laheteta Firestoreen eika edistymista kirjata.
  var previewCleanup = null;

  function previewStep(s) {
    var body = $("sheet-body");
    body.innerHTML = "";
    $("sheet-title").textContent =
      "TESTI: " + (s.title || s.id).toUpperCase() + " (" + s.type + ")";
    $("veil").classList.add("open");
    $("sheet").classList.add("open");
    document.body.classList.add("sheet-lock");

    var hints = s.hints || [];
    var hintIdx = 0;
    var api = {
      try: function (guess) {
        msg("TESTI: lahetys '" + String(guess).slice(0, 40) +
            "' - ei kirjattu kantaan.", false);
        var note = document.createElement("div");
        note.className = "notice ok";
        note.textContent = "LÄPÄISY ONNISTUI (testitila - kanta koskematon)";
        body.appendChild(note);
        if (window.Audio) window.Audio.success();
        return Promise.resolve({ ok: true });
      },
      hint: function () {
        return hintIdx < hints.length ? hints[hintIdx++] : null;
      },
      wrong: function () { return 0; }
    };

    var fn = window.Steps && window.Steps[s.type];
    if (fn) {
      var c = fn(body, s, api);
      if (typeof c === "function") previewCleanup = c;
    } else {
      body.innerHTML = '<div class="notice err">Tuntematon tyyppi: ' +
        String(s.type) + " - moduulia ei ladattu.</div>";
    }
  }

  function closePreview() {
    $("veil").classList.remove("open");
    $("sheet").classList.remove("open");
    document.body.classList.remove("sheet-lock");
    if (typeof previewCleanup === "function") {
      try { previewCleanup(); } catch (e) {}
      previewCleanup = null;
    }
  }
  $("veil").addEventListener("click", closePreview);
  $("sheet-close").addEventListener("click", closePreview);

  // --- Konfiguraatio -------------------------------------------------
  $("btn-save-config").addEventListener("click", function () {
    var finalCode = $("cfg-finalCode").value;
    Promise.all([
      db().collection("config").doc("game").set({
        initialPrompt: $("cfg-initialPrompt").value,
        finalMessage: $("cfg-finalMessage").value
      }, { merge: true }),
      db().collection("solutions").doc("final").set({
        answers: finalCode.split("\n").map(norm).filter(Boolean)
      })
    ]).then(function () { msg("Konfiguraatio tallennettu."); })
      .catch(function (e) { msg("Virhe: " + e.message, true); });
  });

  // --- JSON export/import ---------------------------------------------
  $("btn-export").addEventListener("click", function (e) {
    e.preventDefault();
    var out = { config: {}, steps: [], solutions: {}, rewards: {} };
    db().collection("config").doc("game").get().then(function (d) {
      if (d.exists) out.config = d.data();
      return db().collection("steps").get();
    }).then(function (qs) {
      out.steps = qs.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
      return db().collection("solutions").get();
    }).then(function (qs) {
      qs.docs.forEach(function (d) { out.solutions[d.id] = d.data(); });
      return db().collection("rewards").get();
    }).then(function (qs) {
      qs.docs.forEach(function (d) { out.rewards[d.id] = d.data(); });
      var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "salapoliisi-export-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      msg("Data viety tiedostoon. HUOM: tiedosto sisaltaa vastaukset - ala lataa versionhallintaan.");
    }).catch(function (e) { msg("Vienti epaonnistui: " + e.message, true); });
  });

  $("btn-import").addEventListener("click", function (e) {
    e.preventDefault();
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json";
    inp.onchange = function () {
      var f = inp.files[0];
      if (!f) return;
      f.text().then(function (txt) {
        var data;
        try { data = JSON.parse(txt); }
        catch (err) { return msg("Virheellinen JSON-tiedosto.", true); }
        if (!confirm("Tuodaan data Firestoreen? Ylikirjoittaa samannimiset dokumentit.")) return;
        var batch = db().batch();
        if (data.config) batch.set(db().collection("config").doc("game"), data.config, { merge: true });
        (data.steps || []).forEach(function (s) {
          var id = s.id; delete s.id;
          batch.set(db().collection("steps").doc(id), s);
        });
        Object.keys(data.solutions || {}).forEach(function (id) {
          batch.set(db().collection("solutions").doc(id), data.solutions[id]);
        });
        Object.keys(data.rewards || {}).forEach(function (id) {
          batch.set(db().collection("rewards").doc(id), data.rewards[id]);
        });
        return batch.commit();
      }).then(function () {
        msg("Tuonti valmis.");
        loadAll();
      }).catch(function (e) { msg("Tuonti epaonnistui: " + e.message, true); });
    };
    inp.click();
  });
})();
