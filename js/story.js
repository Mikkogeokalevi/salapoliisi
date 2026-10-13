// Salapoliisi - story.js: chat-virtan renderointi ja kirjoitusefektit

(function () {
  "use strict";

  var Story = { el: null, scrollEl: null };

  Story.init = function (scrollEl) {
    Story.scrollEl = scrollEl;
    Story.el = document.createElement("div");
    scrollEl.appendChild(Story.el);
  };

  function scrollDown() {
    requestAnimationFrame(function () {
      var el = Story.scrollEl;
      if (!el) return;
      // scrollIntoView vierittaa oikean kontekstin (sisainen tai sivu)
      if (el.lastElementChild) {
        el.lastElementChild.scrollIntoView({ block: "end", behavior: "smooth" });
      }
      el.scrollTop = el.scrollHeight;
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
  }

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

  // Viestin tyypit ------------------------------------------------

  // Handlerin viesti typewriter-efektilla. Palauttaa Promise.
  Story.handler = function (text, opts) {
    opts = opts || {};
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
    scrollDown();
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
    b.textContent = text;
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
    btn.textContent = "Avaa tehtava";
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
        if (m && m.ask) return Story.ask(m);
        return Story.handler(m.text || "", m || {});
      });
    });
    return p.then(function () { if (done) done(); });
  };

  window.Story = Story;
})();
