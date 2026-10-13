// Pulmatyyppi: morse - kuuntele morseviesti ja selvita sana
// params: { wpm?: 12 } - aanitetty teksti tulee solutionsiin, mutta
// pelaajan pitaa kuulla se: client saa "transmission"-tekstin paramsista
// (morse-luonne: teksti on kuultavissa joka tapauksessa).
window.Steps["morse"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  var params = step.params || {};

  U.prompt(container, step.prompt);

  var player = document.createElement("div");
  player.className = "morse-player";

  var viz = document.createElement("div");
  viz.className = "morse-viz";
  var beam = document.createElement("div");
  beam.className = "beam";
  viz.appendChild(beam);

  var key = document.createElement("div");
  key.className = "morse-key";

  var playBtn = document.createElement("button");
  playBtn.className = "btn primary";
  playBtn.style.width = "100%";
  playBtn.textContent = "▶ Toista lahete";

  var speedBtn = document.createElement("button");
  speedBtn.className = "btn ghost";
  speedBtn.style.width = "100%";
  speedBtn.style.marginTop = ".5rem";
  speedBtn.textContent = "▶ Toista hitaammin";

  var playing = false;
  var MORSE = window.Audio ? window.Audio.MORSE : {};

  function showCode(txt) {
    // Nayta morse-merkit reaaliajassa osana soitinta
    key.textContent = "";
    var s = String(txt || "").toLowerCase();
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      out.push(c === " " ? "   " : (MORSE[c] || ""));
    }
    key.textContent = out.join(" ");
  }

  function play(wpm) {
    if (playing || !params.message) return;
    playing = true;
    playBtn.disabled = true;
    speedBtn.disabled = true;
    viz.classList.add("on");
    showCode(params.showCode === false ? "" : params.message);
    var dur = window.Audio.morse(params.message, { wpm: wpm }, function (on) {
      beam.style.left = on ? "50%" : "0%";
    });
    setTimeout(function () {
      playing = false;
      viz.classList.remove("on");
      playBtn.disabled = false;
      speedBtn.disabled = false;
      if (params.showCode !== false) key.textContent = "";
    }, dur + 300);
  }

  playBtn.addEventListener("click", function () { play(params.wpm || 12); });
  speedBtn.addEventListener("click", function () { play(Math.max(5, (params.wpm || 12) - 5)); });

  player.appendChild(viz);
  player.appendChild(key);
  player.appendChild(playBtn);
  player.appendChild(speedBtn);
  container.appendChild(player);

  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.answerRow(container, "Kuultu sana...", "Laheta", submit);
  U.hint(container, api);
};
