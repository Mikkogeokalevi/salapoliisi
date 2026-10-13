// Salapoliisi - engine.js: pelitila, vastaustarkistus, sessiot, vihjeet
//
// Vastussuojaus: oikeat vastaukset ovat Firestoressa `solutions`-kokoelmassa,
// jota pelaaja ei voi lukea. Arvaus kirjoitetaan `solved/{uid}_{step}`-
// dokumenttina; Firestore-saanto vertaa sita ratkaisuun palvelimella.
// Vaara arvaus = permission-denied. Oikea arvaus -> dokumentti syntyy ->
// `rewards/{step}` (koodinpala) tulee luettavaksi.

(function () {
  "use strict";

  var Engine = {
    user: null,
    config: null,
    steps: [],
    solved: {},          // stepId -> true
    codeParts: {},       // stepId -> codePart
    reveals: {},         // stepId -> revealText
    wrongCounts: {},     // stepId -> n
    hintsUsed: {},       // stepId -> n
    nickname: null,

    // Tapahtumien kasittelijat (index.html asettaa)
    on: {} // { messages(fn), solved(fn), complete(fn) }
  };

  function db() { return window.fb.db; }

  // Normalisointi: sama kuin seed/import-tekee vastauksille.
  Engine.normalize = function (s) {
    return String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  // --- Alustus ---------------------------------------------------
  Engine.init = function () {
    return window.fb.ensurePlayerAuth().then(function (user) {
      Engine.user = user;
      return Promise.all([
        db().collection("config").doc("game").get(),
        db().collection("steps").get()
      ]);
    }).then(function (res) {
      Engine.config = res[0].exists ? res[0].data() : {};
      Engine.steps = res[1].docs
        .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

      // Paikallinen nimimerkki
      try {
        Engine.nickname = localStorage.getItem("sp_nick") || null;
      } catch (e) { /* localStorage pois kaytosta */ }

      return Engine._restore();
    }).then(function () {
      // Tarkista onko sessio jo olemassa -> createdAt sailyy ennallaan
      return db().collection("sessions").doc(Engine.user.uid).get()
        .then(function (d) { Engine._sessionCreated = d.exists; })
        .catch(function () {});
    }).then(function () {
      return Engine._touchSession();
    });
  };

  // Palauta edistyminen: luetaan omat solved-dokumentit ja rewardsit.
  Engine._restore = function () {
    var uid = Engine.user.uid;
    var gets = Engine.steps.map(function (st) {
      return db().collection("solved").doc(uid + "_" + st.id).get()
        .then(function (d) { return { step: st, exists: d.exists }; })
        .catch(function () { return { step: st, exists: false }; });
    });
    // Lisaksi loppukoodi ("final")
    gets.push(
      db().collection("solved").doc(uid + "_final").get()
        .then(function (d) { return { step: { id: "final" }, exists: d.exists }; })
        .catch(function () { return { step: { id: "final" }, exists: false }; })
    );

    return Promise.all(gets).then(function (rows) {
      var rewardGets = [];
      rows.forEach(function (r) {
        if (!r.exists) return;
        Engine.solved[r.step.id] = true;
        rewardGets.push(
          db().collection("rewards").doc(r.step.id).get().then(function (d) {
            if (d.exists) {
              Engine.codeParts[r.step.id] = d.data().codePart || "";
              Engine.reveals[r.step.id] = d.data().revealText || "";
            }
          }).catch(function () {})
        );
      });
      return Promise.all(rewardGets);
    });
  };

  Engine._sessionCreated = false;
  Engine._touchSession = function () {
    var data = {
      nickname: Engine.nickname || null,
      lastActiveAt: window.fb.serverTs(),
      currentStep: Engine.currentStepIndex(),
      stepsTotal: Engine.steps.length,
      completed: !!Engine.solved["final"],
      hintsUsed: Engine.hintsUsed
    };
    if (!Engine._sessionCreated) {
      data.createdAt = window.fb.serverTs();
      Engine._sessionCreated = true;
    }
    return db().collection("sessions").doc(Engine.user.uid)
      .set(data, { merge: true })
      .catch(function () {});
  };

  // --- Pelivirta -------------------------------------------------

  Engine.currentStepIndex = function () {
    for (var i = 0; i < Engine.steps.length; i++) {
      if (!Engine.solved[Engine.steps[i].id]) return i;
    }
    return Engine.steps.length; // kaikki ratkaistu -> odottaa loppukoodia
  };

  Engine.currentStep = function () {
    var i = Engine.currentStepIndex();
    return i < Engine.steps.length ? Engine.steps[i] : null;
  };

  Engine.isComplete = function () { return !!Engine.solved["final"]; };

  Engine.assembledCode = function () {
    var parts = [];
    Engine.steps.forEach(function (st) {
      if (Engine.codeParts[st.id]) parts.push(Engine.codeParts[st.id]);
    });
    return parts.join("");
  };

  // Arvauksen lahetys. Palauttaa Promise<{ok, reveal, codePart}>.
  Engine.submitGuess = function (stepId, guessRaw) {
    var uid = Engine.user.uid;
    var guess = Engine.normalize(guessRaw);
    if (!guess) return Promise.resolve({ ok: false, empty: true });

    return db().collection("solved").doc(uid + "_" + stepId).set({
      uid: uid,
      step: stepId,
      guess: guess,
      at: window.fb.serverTs()
    }).then(function () {
      // Onnistui = saanto hyvaksyi arvauksen
      Engine.solved[stepId] = true;
      return db().collection("rewards").doc(stepId).get().then(function (d) {
        var r = d.exists ? d.data() : {};
        Engine.codeParts[stepId] = r.codePart || "";
        Engine.reveals[stepId] = r.revealText || "";
        Engine._touchSession();
        return { ok: true, reveal: Engine.reveals[stepId], codePart: Engine.codeParts[stepId] };
      });
    }).catch(function (err) {
      if (err && err.code === "permission-denied") {
        // Vaara arvaus
        Engine.wrongCounts[stepId] = (Engine.wrongCounts[stepId] || 0) + 1;
        db().collection("sessions").doc(uid)
          .collection("wrongAnswers").add({
            step: stepId,
            value: Engine.normalize(guessRaw).slice(0, 80),
            at: window.fb.serverTs()
          }).catch(function () {});
        return { ok: false };
      }
      // Oikea virhe (verkko, auth ym.)
      return { ok: false, error: err };
    });
  };

  // Vihjeet
  Engine.nextHint = function (step) {
    var used = Engine.hintsUsed[step.id] || 0;
    var hints = step.hints || [];
    if (used >= hints.length) return null;
    Engine.hintsUsed[step.id] = used + 1;
    Engine._touchSession();
    return hints[used];
  };

  Engine.wrongCount = function (stepId) {
    return Engine.wrongCounts[stepId] || 0;
  };

  // Nimimerkki
  Engine.setNickname = function (nick) {
    Engine.nickname = String(nick || "").trim().slice(0, 24) || "tuntematon";
    try { localStorage.setItem("sp_nick", Engine.nickname); } catch (e) {}
    return Engine._touchSession();
  };

  // --- Sessio & paattyminen ---------------------------------------

  Engine.markCompleted = function () {
    return db().collection("sessions").doc(Engine.user.uid).set({
      completed: true,
      completedAt: window.fb.serverTs(),
      lastActiveAt: window.fb.serverTs()
    }, { merge: true }).catch(function () {});
  };

  window.Engine = Engine;
})();
