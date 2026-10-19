(function (global) {
  var styled = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function ensureStyle() {
    if (styled || !global.document) return;
    styled = true;
    var style = global.document.createElement("style");
    style.textContent =
      ".qw{margin-top:8px;font-weight:400;text-align:left}" +
      ".qw strong{display:block;margin-bottom:4px}" +
      ".qw ul{margin:0 0 8px 18px;padding:0}" +
      ".qw li{margin:3px 0}" +
      ".qw table{width:100%;border-collapse:collapse;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace}" +
      ".qw td{padding:3px 6px;border-bottom:1px solid rgba(127,127,127,.25);vertical-align:top}" +
      ".qw .ok{color:#2F6B52;font-weight:700}.qw .bad{color:#A04242;font-weight:700}" +
      ".qw-hint{margin:6px 0 0;font-size:14px}" +
      ".qw-btn{margin-top:8px;font:inherit;cursor:pointer;border:2px solid #C9A227;background:transparent;border-radius:8px;padding:6px 12px;font-weight:700}" +
      ".qw-stages{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}" +
      ".qw-stage{flex:1;min-width:96px;text-align:center;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:6px 8px;border:1px solid #E3D9BE;border-radius:4px;color:#6E6E6E;background:#fff}" +
      ".qw-stage.on{border-color:#C9A227;color:#132A4C;background:#FAF6EC}" +
      ".qw-stage.done{border-color:#2F6B52;color:#2F6B52}";
    global.document.head.appendChild(style);
  }

  var STAGE_NAMES = ["Beginner", "Intermediate", "Advanced"];

  function stageIndex(index, total) {
    var size = Math.max(1, Math.ceil((total || 1) / 3));
    return Math.min(2, Math.floor(index / size));
  }

  function stageName(index, total) {
    return STAGE_NAMES[stageIndex(index, total)];
  }

  function progressLabel(index, total) {
    var size = Math.max(1, Math.ceil(total / 3));
    var stage = stageIndex(index, total);
    var start = stage * size;
    var end = Math.min(total, start + size);
    return STAGE_NAMES[stage] + " · question " + (index - start + 1) + " of " + (end - start);
  }

  function paintStages(index, total) {
    ensureStyle();
    if (!global.document) return;
    var anchor = global.document.getElementById("progressText") || global.document.getElementById("quizScreen");
    if (!anchor || !anchor.parentNode) return;
    var bar = global.document.getElementById("qwStages");
    if (!bar) {
      bar = global.document.createElement("div");
      bar.id = "qwStages";
      bar.className = "qw-stages";
      anchor.parentNode.insertBefore(bar, anchor);
    }
    var active = stageIndex(index, total);
    bar.innerHTML = STAGE_NAMES.map(function (name, i) {
      var cls = "qw-stage" + (i === active ? " on" : i < active ? " done" : "");
      return '<span class="' + cls + '">' + name + "</span>";
    }).join("");
  }

  function optionsOf(q) {
    return q.options || q.choices || [];
  }

  function correctIndex(q) {
    return q.correct != null ? q.correct : q.answer;
  }

  function messages(q, chosen) {
    var topic = q.category || "this idea";
    return [
      "You chose " + chosen + ".",
      "What is right: this question is about " + topic + ".",
      "What is different: that option does not match how " + topic + " works in this question.",
      "Where to look next: reread the question and stay with " + topic + " before you open a hint."
    ];
  }

  function hintSteps(q) {
    var topic = q.category || "the idea in the question";
    var nearly = q.explanation
      ? q.explanation
      : "Compare each option with the question one more time. Only one of them fits " + topic + ".";
    return [
      "Hint 1 — the idea: stay inside " + topic + ". Ignore options that belong to a different topic.",
      "Hint 2 — the spot: the useful words are in the question itself, not in the option that sounded familiar.",
      "Hint 3 — nearly there: " + nearly
    ];
  }

  function missInnerHtml(q, chosen) {
    var lines = messages(q, chosen)
      .map(function (line) {
        return "<li>" + esc(line) + "</li>";
      })
      .join("");
    return (
      '<div class="qw"><ul>' +
      lines +
      "</ul><table><tr><td class=\"bad\">✗</td><td>Yours: " +
      esc(chosen) +
      "</td><td>Expected: (hidden until Hint 3)</td></tr></table></div>"
    );
  }

  function showMiss(els, q, idx) {
    ensureStyle();
    var opts = optionsOf(q);
    var chosen = opts[idx] != null ? opts[idx] : "no answer";
    var answer = correctIndex(q);
    els.buttons.forEach(function (btn, i) {
      btn.disabled = true;
      if (i === idx) btn.classList.add("wrong-answer");
      else btn.classList.add("dimmed");
    });
    els.feedbackEl.className = "feedback show is-incorrect";
    els.feedbackLabelEl.textContent = "Where to look";
    els.feedbackExplainEl.innerHTML = missInnerHtml(q, chosen);
    var step = 0;
    var steps = hintSteps(q);
    var button = global.document.createElement("button");
    button.type = "button";
    button.className = "qw-btn";
    button.textContent = "Hint";
    button.addEventListener("click", function () {
      if (step >= 3) return;
      var note = global.document.createElement("p");
      note.className = "qw-hint";
      note.textContent = steps[step];
      els.feedbackExplainEl.appendChild(note);
      step += 1;
      if (step >= 3) {
        if (els.buttons[answer]) {
          els.buttons[answer].classList.remove("dimmed");
          els.buttons[answer].classList.add("correct-answer");
        }
        button.disabled = true;
        button.textContent = "All 3 hints used";
      }
    });
    els.feedbackExplainEl.appendChild(button);
  }

  function appendHints(parent, q) {
    ensureStyle();
    var step = 0;
    var steps = hintSteps(q);
    var button = global.document.createElement("button");
    button.type = "button";
    button.className = "qw-btn";
    button.textContent = "Hint";
    button.addEventListener("click", function () {
      if (step >= 3) return;
      var note = global.document.createElement("p");
      note.className = "qw-hint";
      note.textContent = steps[step];
      parent.appendChild(note);
      step += 1;
      if (step >= 3) {
        var opts = optionsOf(q);
        var answer = correctIndex(q);
        if (opts[answer] != null) {
          var close = global.document.createElement("p");
          close.className = "qw-hint";
          close.textContent = "The closer choice is: " + opts[answer];
          parent.appendChild(close);
        }
        button.disabled = true;
        button.textContent = "All 3 hints used";
      }
    });
    parent.appendChild(button);
  }

  global.QuizWhere = {
    messages: messages,
    missInnerHtml: missInnerHtml,
    showMiss: showMiss,
    appendHints: appendHints,
    stageName: stageName,
    progressLabel: progressLabel,
    paintStages: paintStages
  };
})(typeof window !== "undefined" ? window : this);
