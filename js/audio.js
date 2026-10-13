// Salapoliisi - audio.js: Web Audio -aanet (ei aanitiedostoja)

(function () {
  "use strict";

  var ctx = null;

  function ac() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(function () {});
    return ctx;
  }

  // Pieni laiskahaku: aanet sallitaan vasta ensimmaisen eleen jalkeen
  function ensure() {
    var c = ac();
    if (!c) return null;
    return c;
  }

  function tone(freq, dur, opts) {
    opts = opts || {};
    var c = ensure();
    if (!c) return;
    var t0 = c.currentTime + (opts.at || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  var Audio = {
    unlock: function () { ensure(); },

    click: function () { tone(660, 0.05, { gain: 0.08 }); },
    tick: function () { tone(880, 0.03, { gain: 0.06, type: "square" }); },

    msg: function () {
      tone(880, 0.06, { gain: 0.07 });
      tone(1320, 0.07, { gain: 0.06, at: 0.06 });
    },

    success: function () {
      tone(523, 0.12, { gain: 0.12 });
      tone(659, 0.12, { gain: 0.12, at: 0.1 });
      tone(784, 0.2, { gain: 0.14, at: 0.2 });
    },

    error: function () {
      tone(220, 0.15, { gain: 0.12, type: "sawtooth" });
      tone(185, 0.22, { gain: 0.1, type: "sawtooth", at: 0.08 });
    },

    boot: function () {
      tone(440, 0.05, { gain: 0.06 });
      tone(554, 0.05, { gain: 0.06, at: 0.07 });
      tone(659, 0.09, { gain: 0.07, at: 0.14 });
    },

    // Morse: txt merkkijono, cb(on) kutsutaan valoon/kirkkauteen
    morse: function (txt, opts, cb) {
      opts = opts || {};
      var wpm = opts.wpm || 12;
      var unit = 1.2 / wpm; // sekuntia per piste
      var c = ensure();
      var t = 0;
      var MORSE = Audio.MORSE;
      var s = txt.toLowerCase();

      for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (ch === " ") { t += unit * 7; continue; }
        var code = MORSE[ch];
        if (!code) continue;
        for (var j = 0; j < code.length; j++) {
          var dur = code[j] === "-" ? unit * 3 : unit;
          if (c) {
            (function (at, d) {
              setTimeout(function () {
                tone(700, d, { gain: 0.2 });
                if (cb) cb(true);
                setTimeout(function () { if (cb) cb(false); }, d * 1000);
              }, at * 1000);
            })(t, dur);
          }
          t += dur + unit;
        }
        t += unit * 2; // kirjainvali (yksikko jo lisatty)
      }
      return t * 1000; // kokonaiskesto ms
    },

    MORSE: {
      a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.",
      g: "--.", h: "....", i: "..", j: ".---", k: "-.-", l: ".-..",
      m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.",
      s: "...", t: "-", u: "..-", v: "...-", w: ".--", x: "-..-",
      y: "-.--", z: "--..",
      "0": "-----", "1": ".----", "2": "..---", "3": "...--",
      "4": "....-", "5": ".....", "6": "-....", "7": "--...",
      "8": "---..", "9": "----.",
      "å": ".--.-", "ä": ".-.-", "ö": "---."
    }
  };

  window.Audio = Audio;
})();
