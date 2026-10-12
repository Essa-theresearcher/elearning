(function (global) {
  var STEPS = {
    predict: [
      "Read the code from top to bottom once without answering.",
      "On paper or out loud, track each variable after every line that changes it.",
      "Predict the output in one sentence before you tap an option.",
      "Pick the option that matches your prediction — not the one that “looks familiar.”"
    ],
    fix: [
      "Find the line number Python would reach before it stops.",
      "Read the last error message — it names the line and the problem type.",
      "Ask: what type does this value have (text, number, list)?",
      "Fix one line only, then mentally run the program again."
    ],
    fill: [
      "What should change inside the loop or after the assignment?",
      "Check symbols: = replaces, += adds to what is already there.",
      "Trace one loop round with small numbers.",
      "Choose the line that makes the final print match the goal."
    ],
    order: [
      "Which line must run first so names exist before use?",
      "Indentation: which lines belong inside the loop or function?",
      "Build the smallest working order (3 lines), then add the rest.",
      "Tap lines in order; remove one and retry if the check fails."
    ],
    code: [
      "Restate the task in your own words in one sentence.",
      "Write the smallest print that proves one part works, then run.",
      "Compare your output to the red “expected” line — fix one difference at a time.",
      "If there is an error, read the last line of the message first."
    ],
    visual: [
      "What does the snake see (head, food, body)? Draw it on paper.",
      "Should the next move get closer to food or avoid the body?",
      "Change one direction rule, test, then run the game again.",
      "If it crashes, say out loud which cell caused the crash and why."
    ],
    default: [
      "Pause before trying again — rushing hides the lesson.",
      "Name what you believed; name what the program actually did.",
      "Change one small thing and test again.",
      "Use a hint only after you have tried these steps."
    ]
  };

  function stepsForType(type) {
    var t = (type || "").toLowerCase();
    if (t.indexOf("predict") >= 0) return STEPS.predict;
    if (t.indexOf("fix") >= 0) return STEPS.fix;
    if (t.indexOf("fill") >= 0) return STEPS.fill;
    if (t.indexOf("order") >= 0) return STEPS.order;
    return STEPS.default;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function stepsListHtml(type) {
    return (
      "<ol class=\"coach-steps\">" +
      stepsForType(type)
        .map(function (step) {
          return "<li>" + esc(step) + "</li>";
        })
        .join("") +
      "</ol>"
    );
  }

  function wrongChoiceHtml(challenge, chosenIndex) {
    var chosen =
      challenge.o && chosenIndex >= 0 ? challenge.o[chosenIndex] : "?";
    var correct =
      challenge.o && challenge.a >= 0 ? challenge.o[challenge.a] : "?";
    return (
      '<div class="coach-box coach-wrong">' +
      "<strong>Let us think it through</strong>" +
      "<p>You chose <b>" +
      esc(chosen) +
      "</b>. The correct answer is <b>" +
      esc(correct) +
      "</b> — but the goal is to understand <em>why</em>, not to memorise.</p>" +
      "<p><b>Where people go wrong:</b> guessing from a keyword instead of running the program in your head line by line.</p>" +
      stepsListHtml(challenge.t) +
      "<p class=\"coach-foot\">Try those steps, then answer again. Use 💡 Hint only if you are still stuck (hints cost stars).</p>" +
      "</div>"
    );
  }

  function wrongOrderHtml(challenge) {
    return (
      '<div class="coach-box coach-wrong">' +
      "<strong>Order not quite right</strong>" +
      "<p>Programs are stories: definitions and data first, then loops, then output.</p>" +
      stepsListHtml("Put in order") +
      "<p class=\"coach-foot\">Tap a line in the slot to remove it, rebuild, and press Check order again.</p>" +
      "</div>"
    );
  }

  function codeFailHtml(summary) {
    var err = summary.error || "";
    var tip = "";
    if (/NameError|not defined/i.test(err)) {
      tip = "A name is used before it exists, or spelled differently. Check every variable name.";
    } else if (/TypeError|unsupported operand/i.test(err)) {
      tip = "You mixed types (e.g. text + number). Convert with int(), float(), or str() where needed.";
    } else if (/IndentationError|expected an indented block/i.test(err)) {
      tip = "Python cares about spaces after : — the line under if/for/def must be indented.";
    } else if (/SyntaxError/i.test(err)) {
      tip = "Syntax: missing quote, bracket, or colon. Compare your line to the starter code.";
    } else if (summary.emptyOutput) {
      tip = "The program ran but printed nothing. Did you forget print()?";
    } else if (summary.outputMismatch) {
      tip = "Output is close — compare spaces, capitals, and line breaks to the expected block.";
    } else {
      tip = "Read the failed test: input → expected → got. Fix the first difference only.";
    }
    return (
      '<div class="coach-box coach-wrong">' +
      "<strong>Debugging coach</strong>" +
      "<p>" +
      esc(tip) +
      "</p>" +
      stepsListHtml("code") +
      "</div>"
    );
  }

  function snakeCrashHtml(reason) {
    return (
      '<div class="coach-box coach-wrong">' +
      "<strong>What went wrong on the board</strong>" +
      "<p>" +
      esc(reason) +
      "</p>" +
      stepsListHtml("visual") +
      "</div>"
    );
  }

  function protocolHtml(title) {
    return (
      '<div class="coach-box coach-protocol">' +
      "<strong>" +
      esc(title || "Problem-solving steps (use every day)") +
      "</strong>" +
      stepsListHtml("default") +
      "</div>"
    );
  }

  var AFFIRMATIONS = [
    "Pause — not quit. One slow breath. Your brain is wiring something new right now.",
    "Feeling stuck is proof you are past what you already knew. That is growth, not failure.",
    "You do not need the full answer yet. One small true step is enough for this minute.",
    "Every strong coder has sat exactly here. Stay curious for one more try.",
    "Compare what you expected with what happened — that gap is where critical thinking lives.",
    "It is okay to be frustrated. It is not okay to believe you cannot learn this. You can.",
    "Shrink the problem: one line, one test, one move. You have done hard things before.",
    "Hints are tools, not defeat. Try your steps first, then use help with pride."
  ];

  var struggleCount = 0;

  function recordStruggle() {
    struggleCount += 1;
    if (struggleCount === 3 || struggleCount === 6 || struggleCount === 9 || struggleCount % 5 === 0) {
      return encouragementHtml();
    }
    return "";
  }

  function resetStruggle() {
    struggleCount = 0;
  }

  function encouragementHtml() {
    var msg = AFFIRMATIONS[(struggleCount - 1) % AFFIRMATIONS.length];
    return (
      '<div class="coach-affirm" role="status">' +
      "<strong>You are closer than it feels</strong>" +
      "<p>" +
      esc(msg) +
      "</p>" +
      "<p class=\"coach-foot\">Take one small step. You are allowed to move slowly.</p>" +
      "</div>"
    );
  }

  global.ThinkingCoach = {
    stepsForType: stepsForType,
    stepsListHtml: stepsListHtml,
    wrongChoiceHtml: wrongChoiceHtml,
    wrongOrderHtml: wrongOrderHtml,
    codeFailHtml: codeFailHtml,
    snakeCrashHtml: snakeCrashHtml,
    protocolHtml: protocolHtml,
    recordStruggle: recordStruggle,
    resetStruggle: resetStruggle,
    encouragementHtml: encouragementHtml
  };
})(typeof window !== "undefined" ? window : this);
