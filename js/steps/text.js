// Pulmatyyppi: text - vapaa tekstivastaus
// params: { placeholder?, buttonText? }
window.Steps["text"] = function (container, step, api) {
  "use strict";
  var U = window.StepsUI;
  U.prompt(container, step.prompt);
  var fb = U.feedback(container);
  var submit = U.submitter(container, api, fb);
  U.answerRow(container,
    (step.params && step.params.placeholder) || "Vastaus...",
    (step.params && step.params.buttonText) || "Laheta",
    submit);
  U.hint(container, api);
};
