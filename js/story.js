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
    if (Story.scrollEl) {
      Story.scrollEl.scrollTop = Story.scrollEl.scrollHeight + 400;
    }
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
      w.textContent = who;
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
    var who = opts.who || "JOHTAJA";
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
    var b = addMsg("player");
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

  // Handlerin moniviestinen "rundi"
  Story.runMessages = function (msgs, done) {
    var p = Promise.resolve();
    (msgs || []).forEach(function (m) {
      p = p.then(function () {
        if (typeof m === "string") return Story.handler(m);
        if (m && m.type === "system") return Story.system(m.text);
        return Story.handler(m.text || "", m || {});
      });
    });
    return p.then(function () { if (done) done(); });
  };

  window.Story = Story;
})();
