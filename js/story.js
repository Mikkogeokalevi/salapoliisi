// Salapoliisi - story.js: chat-virtan renderointi ja kirjoitusefektit

(function () {
  "use strict";

  var Story = { el: null, scrollEl: null };

  Story.init = function (scrollEl) {
    Story.scrollEl = scrollEl;
    Story.el = document.createElement("div");
    scrollEl.appendChild(Story.el);
    // "Sticky scroll": seuraa pohjaa vain jos pelaaja on jo alhaalla.
    // Jos pelaaja vierittaa ylos lukemaan, uudet viestit eivat repi
    // nakymaa alta pois.
    Story._pinned = true;
    scrollEl.addEventListener("scroll", function () {
      Story._pinned =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 60;
    }, { passive: true });
  };

  function scrollDown(force) {
    requestAnimationFrame(function () {
      var el = Story.scrollEl;
      if (!el) return;
      if (!force && Story._pinned === false) return;
      el.scrollTop = el.scrollHeight;
    });
  }

  // Julkinen scroll - inputbarin avautuminen ym. voi kutsua tata
  Story.scroll = scrollDown;

  function stamp() {
    var d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }

  function bubble() {
    var b = document.createElement("div");
    b.className = "bubble";
    return b;
  }

  function addMsg(cls, who) {
    var row = document.createElement("div");
    row.className = "msg " + cls;
    var col = document.createElement("div");
    col.className = "msg-col";
    if (who) {
      var w = document.createElement("div");
      w.className = "who";
      w.textContent = who + " · " + stamp();
      col.appendChild(w);
    }
    var b = bubble();
    col.appendChild(b);
    row.appendChild(col);
    Story.el.appendChild(row);
    scrollDown();
    return b;
  }

  // {nimi} viesteissa -> pelaajan nimimerkki
  function subst(text) {
    var nick = (window.Engine && window.Engine.nickname) || "";
    return String(text || "").replace(/\{nimi\}/gi, nick || "agentti");
  }

  // Viestin tyypit ------------------------------------------------

  // Handlerin viesti typewriter-efektilla. Palauttaa Promise.
  Story.handler = function (text, opts) {
    opts = opts || {};
    text = subst(text);
    var who = opts.who || "MIKKOKALEVI";
    var delay = opts.delay == null ? 650 : opts.delay;
    var speed = opts.speed == null ? 14 : opts.speed;

    return new Promise(function (resolve) {
      // Typo-indikaattori
      var tRow = document.createElement("div");
      tRow.className = "msg handler typing";
      var tb = bubble();
      for (var i = 0; i < 3; i++) {
        var d = document.createElement("span");
        d.className = "dot";
        tb.appendChild(d);
      }
      tRow.appendChild(tb);
      Story.el.appendChild(tRow);
      scrollDown();

      setTimeout(function () {
        tRow.remove();
        var b = addMsg("handler", who);
        if (opts.instant || speed <= 0) {
          b.textContent = text;
          scrollDown();
          resolve();
          return;
        }
        var i = 0;
        var timer = setInterval(function () {
          i += 2;
          b.textContent = text.slice(0, i);
          scrollDown();
          if (i >= text.length) {
            clearInterval(timer);
            resolve();
          }
        }, speed);
      }, delay);
    });
  };

  Story.player = function (text) {
    var nick = (window.Engine && window.Engine.nickname) || "SINA";
    var b = addMsg("player", nick.toUpperCase());
    b.textContent = text;
    scrollDown(true);
    return Promise.resolve();
  };

  Story.system = function (text) {
    var b = addMsg("system");
    b.textContent = text;
    scrollDown();
    return Promise.resolve();
  };

  Story.reward = function (text, codePart) {
    var b = addMsg("reward");
    b.textContent = subst(text);
    if (codePart) {
      var cp = document.createElement("span");
      cp.className = "code-part";
      cp.textContent = codePart;
      b.appendChild(cp);
    }
    scrollDown();
    return Promise.resolve();
  };

  // Tehtavakortti virtaan (avaa pulma-sheetin)
  Story.taskCard = function (step, onOpen) {
    var card = document.createElement("div");
    card.className = "task-card";
    card.innerHTML =
      '<span class="tag">SAAPUNUT TODISTE</span>' +
      '<div class="t-title"></div>' +
      '<div class="t-desc"></div>';
    card.querySelector(".t-title").textContent = step.title || "Tehtava";
    card.querySelector(".t-desc").textContent = step.promptShort || step.prompt || "";
    var btn = document.createElement("button");
    btn.className = "btn primary";
    btn.style.width = "100%";
    btn.textContent = "Avaa tehtävä";
    btn.addEventListener("click", function () { onOpen(step); });
    card.appendChild(btn);
    Story.el.appendChild(card);
    scrollDown();
    return card;
  };

  // Vapaamuotoinen kysymys pelaajalle - MINKA tahansa vastauksen han kirjoittaa
  // hyvaksytaan ja tarina jatkuu. m = { ask, respond: "..." | [...] }
  Story.ask = function (m) {
    return Story.handler(m.ask).then(function () {
      return Story.waitForInput();
    }).then(function (answer) {
      return Story.player(answer);
    }).then(function () {
      var r = m.respond;
      if (!r) return;
      if (Array.isArray(r)) r = r[Math.floor(Math.random() * r.length)];
      return Story.handler(r, { delay: 1000 });
    });
  };

  // Portti: kysymys johon PITAA vastata hyvaksyttavasti tai ei paasta
  // eteenpain (esim. salassapitosopimus). m = { gate, accept:[..],
  // confirm, deny } - vaara vastaus -> deny-viesti ja kysymys uudestaan.
  Story.gate = function (m) {
    return Story.handler(m.gate).then(function () {
      return Story.waitForInput();
    }).then(function (answer) {
      return Story.player(answer).then(function () { return answer; });
    }).then(function (answer) {
      var acc = m.accept || ["kyllä"];
      var ok = acc.some(function (a) {
        return answer.toLowerCase().indexOf(String(a).toLowerCase()) !== -1;
      });
      if (ok) {
        return Story.handler(m.confirm || "Kirjattu.", { delay: 900 });
      }
      return Story.handler(m.deny || "Ilman hyväksyntää emme voi jatkaa. Yritä uudelleen.",
        { delay: 1000 }).then(function () { return Story.gate(m); });
    });
  };

  // Vapaa keskustelu: pelaaja voi kysya MITA tahansa, handler vastaa
  // avainsanatunnisteella (m.replies) tai oletusvastauksilla (m.default).
  // Keskustelu jatkuu kunnes pelaaja kirjoittaa lopetussanan.
  // m = { chat, replies: {"avain|toinen": "vastaus"}, default: [...],
  //       more: "...", bye: "..." }
  var END_RE = /^\s*(jatka|jatkuu|mennään|mennan|valmis|ei\b|lopeta|ok\b|selvä|pohja)/i;
  Story.chat = function (m) {
    function answer(q) {
      var low = q.toLowerCase();
      var reply = null, replies = m.replies || {};
      Object.keys(replies).forEach(function (group) {
        group.split("|").forEach(function (k) {
          if (!reply && k && low.indexOf(k.toLowerCase()) !== -1) reply = replies[group];
        });
      });
      if (!reply) {
        var defs = m.default && m.default.length ? m.default
          : ["Hyvä kysymys - mutta nyt tehtävät vaativat huomiosi."];
        reply = defs[Math.floor(Math.random() * defs.length)];
      }
      return Story.handler(reply, { delay: 900 });
    }
    function round() {
      return Story.waitForInput().then(function (a) {
        a = (a || "").trim();
        return Story.player(a || "...").then(function () { return a; });
      }).then(function (a) {
        if (END_RE.test(a)) {
          return Story.handler(m.bye || "Selvä - jatketaan.", { delay: 800 });
        }
        return answer(a).then(function () {
          return Story.handler(m.more || "Kysy vielä jotain - tai kirjoita 'jatka'.",
            { delay: 500 });
        }).then(round);
      });
    }
    return Story.handler(m.chat || "Kysy vapaasti - tai kirjoita 'jatka'.").then(round);
  };

  // index.html toteuttaa: palauttaa Promise joka ratkeaa pelaajan tekstiin
  Story.waitForInput = function () {
    return Story._inputFn ? Story._inputFn() : Promise.resolve("...");
  };

  // Handlerin moniviestinen "rundi"
  Story.runMessages = function (msgs, done) {
    var p = Promise.resolve();
    (msgs || []).forEach(function (m) {
      p = p.then(function () {
        if (typeof m === "string") return Story.handler(m);
        if (m && m.type === "system") return Story.system(m.text);
        if (m && m.gate) return Story.gate(m);
        if (m && m.ask) return Story.ask(m);
        if (m && m.chat) return Story.chat(m);
        if (m && typeof m.text === "string") return Story.handler(m.text, m);
        return; // tuntematon objekti - ei tulosteta "[object Object]"
      });
    });
    return p.then(function () { if (done) done(); });
  };

  window.Story = Story;
})();
