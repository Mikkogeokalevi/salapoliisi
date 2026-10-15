// Pulmatyyppi: sequence - muistisarja (Simon): toista sarja.
// params: { sequence: [0..3], padCount?: 4, speed?: 550, startLen?: 2 }
// Jos startLen < seq.length, sarja kasvaa askeleittain (progressiivinen).
window.Steps["sequence"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};
  var seq = params.sequence || [0, 1, 2, 3];
  var padCount = params.padCount || 4;
  var speed = params.speed || 550;
  var startLen = Math.min(params.startLen || seq.length, seq.length);
  var round = startLen;

  U.prompt(container, step.prompt);
  var g2 = U.game();

  var status = document.createElement("div");
  status.className = "muted";
  status.style.cssText = "text-align:center;font-family:var(--mono);font-size:.8rem;margin-bottom:.5rem";
  status.textContent = "Paina aloita kuullaksesi sarjan";
  container.appendChild(status);

  var pads = document.createElement("div");
  pads.className = "seq-pads";
  var padEls = [];
  var TONES = [329, 415, 494, 622, 740, 880];

  function flash(i, dur) {
    var el = padEls[i];
    if (!el) return;
    el.classList.add("lit");
    setTimeout(function () { el.classList.remove("lit"); }, dur || 320);
  }

  // Kevyt tone suoraan tassa (ei riippuvuutta Audio-olion sisaisyyteen)
  function padTone(i) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      var ctx = padTone._c || (padTone._c = new AC());
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = TONES[i % TONES.length];
      g.gain.value = .12;
      o.connect(g).connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .3);
      o.stop(ctx.currentTime + .35);
    } catch (e) {}
  }

  var inputIdx = 0;
  var accepting = false;
  var playing = false;

  function playSeq() {
    if (playing) return;
    playing = true;
    accepting = false;
    inputIdx = 0;
    var active = seq.slice(0, round);
    status.textContent = "Kuuntele... " + active.length + " / " + seq.length;
    var t = 400;
    active.forEach(function (p) {
      setTimeout(function () {
        flash(p, speed * .6);
        padTone(p);
      }, t);
      t += speed;
    });
    setTimeout(function () {
      playing = false;
      accepting = true;
      status.textContent = "Toista " + active.length + " askelta koskettamalla";
    }, t);
  }

  for (var i = 0; i < padCount; i++) {
    (function (idx) {
      var p = document.createElement("button");
      p.className = "seq-pad";
      p.setAttribute("data-i", idx);
      p.addEventListener("click", function () {
        if (!accepting) return;
        flash(idx, 200);
        padTone(idx);
        if (idx === seq[inputIdx]) {
          inputIdx++;
          if (inputIdx >= round) {
            accepting = false;
            if (round >= seq.length) {
              status.textContent = "Sarja oikein!";
              submit(seq.join(""));
            } else {
              round++;
              status.textContent = "Oikein! Seuraavaksi " + round + " askelta...";
              setTimeout(function () { if (g2.alive()) playSeq(); }, 1100);
            }
          }
        } else {
          accepting = false;
          status.textContent = "Väärä – kuuntele uudelleen";
          var fb = fbRef;
          if (fb) fb.show("Väärä sarja. Kuunnellaan uudelleen.", true);
          if (navigator.vibrate) navigator.vibrate(120);
          setTimeout(function () { if (g2.alive()) playSeq(); }, 1200);
        }
      });
      pads.appendChild(p);
      padEls.push(p);
    })(i);
  }
  container.appendChild(pads);

  var fbRef = U.feedback(container);
  var submit = U.submitter(container, api, fbRef);

  var startBtn = U.button(container, "▶ Aloita / kuuntele uudelleen", function () {
    if (window.Audio) window.Audio.unlock();
    playSeq();
  }, false);
  U.hint(container, api);
  return g2.cleanup;
};
