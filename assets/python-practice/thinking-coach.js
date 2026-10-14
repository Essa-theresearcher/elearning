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

  function whereLookHtml(lines, calm) {
    return (
      '<div class="where ' +
      (calm ? "calm" : "alert") +
      '"><strong>Where to look</strong><ul>' +
      lines
        .map(function (line) {
          return "<li>" + esc(line) + "</li>";
        })
        .join("") +
      "</ul></div>"
    );
  }

  function compareTableHtml(rows) {
    var html =
      '<table class="cmp-table"><tr><th></th><th>Yours</th><th>Expected</th></tr>';
    rows.forEach(function (row) {
      html +=
        '<tr><td class="' +
        (row.ok ? "mark-ok" : "mark-bad") +
        '">' +
        (row.ok ? "✓" : "✗") +
        "</td><td>" +
        esc((row.label ? row.label + ": " : "") + row.yours) +
        "</td><td>" +
        esc(row.expected) +
        "</td></tr>";
    });
    return html + "</table>";
  }

  function choiceMessages(challenge, chosenIndex) {
    var chosen =
      challenge.o && chosenIndex >= 0 ? challenge.o[chosenIndex] : "?";
    var code = challenge.code || "";
    var general =
      challenge.h && challenge.h[0]
        ? challenge.h[0]
        : "Run the program from the top, one line at a time.";
    var messages = ["You chose " + chosen + "."];
    if (/input\(/.test(code) && /\+\s*\d/.test(code)) {
      messages.push(
        "What is right: input() does read what was typed.",
        "What is different: input() gives text, and text plus a number stops the program.",
        "Where to look next: the line that adds a number to the input."
      );
    } else if (/['"]\d+['"]\s*\*/.test(code)) {
      messages.push(
        "What is right: * does repeat when the value is text.",
        "What is different: the digits are inside quotes, so this is not multiplication.",
        "Where to look next: the quotes on that line."
      );
    } else if (/['"][^'"]+['"]\s*\+/.test(code) && /print\(/.test(code)) {
      messages.push(
        "What is right: + can join text to text.",
        "What is different: both sides need to be the same kind of value.",
        "Where to look next: the line with +."
      );
    } else if (/def [\w]+\(/.test(code) && !/\breturn\b/.test(code)) {
      messages.push(
        "What is right: the function is defined and then called.",
        "What is different: the function never sends a value back.",
        "Where to look next: inside the function, for the word return."
      );
    } else if (/range\(/.test(code)) {
      messages.push(
        "What is right: the loop body runs once per number range makes.",
        "What is different: range starts at 0 unless you give it a start.",
        "Where to look next: the range(...) line, then what print does with that number."
      );
    } else if (/\belif\b/.test(code)) {
      messages.push(
        "What is right: the conditions are checked from top to bottom.",
        "What is different: only the first true branch runs.",
        "Where to look next: the first if, then the elif under it."
      );
    } else if (/\[.*\]/.test(code) && /print\(/.test(code) && /KeyError|d\[/.test(code)) {
      messages.push(
        "What is right: a dictionary lookup uses the key inside the brackets.",
        "What is different: a missing key stops the program.",
        "Where to look next: the key inside the brackets."
      );
    } else if (/______/.test(code)) {
      messages.push(
        "What is right: the blank sits where a value must change.",
        "What is different: " + general,
        "Where to look next: the blank line. = replaces, += adds to what is already there."
      );
    } else {
      messages.push(
        "What is right: you picked one reading. That shows the gap.",
        "What is different: " + general,
        "Where to look next: the first line that changes a variable, then the print."
      );
    }
    return messages;
  }

  function choiceRows(challenge, chosenIndex) {
    var chosen =
      challenge.o && chosenIndex >= 0 ? challenge.o[chosenIndex] : "?";
    return [
      {
        label: "Your answer",
        yours: chosen,
        expected: "(hidden — Hint 3 gets close)",
        ok: false
      }
    ];
  }

  function wrongChoiceHtml(challenge, chosenIndex) {
    var messages = choiceMessages(challenge, chosenIndex);
    return (
      whereLookHtml(messages) +
      compareTableHtml(choiceRows(challenge, chosenIndex)) +
      "<p class=\"coach-foot\">The matching option stays hidden. Use 💡 Hint if you are still stuck (hints cost stars).</p>"
    );
  }

  function orderMessages(challenge, pick) {
    pick = pick || [];
    var lines = challenge.lines || [];
    var first = 0;
    var i;
    for (i = 0; i < lines.length; i++) {
      if (pick[i] !== i) {
        first = i;
        break;
      }
    }
    var yours =
      pick.length > first && lines[pick[first]] != null
        ? lines[pick[first]]
        : "(empty)";
    var hint =
      challenge.h && challenge.h[0]
        ? challenge.h[0]
        : "Definitions and data first, then the loop, then the print.";
    return [
      "Slot " + (first + 1) + " is different.",
      "What is right: every slot above this one is in an order Python can run.",
      "What is different: slot " + (first + 1) + " has " + yours + ".",
      "Where to look next: " + hint
    ];
  }

  function orderRows(challenge, pick) {
    pick = pick || [];
    var lines = challenge.lines || [];
    var rows = [];
    for (var i = 0; i < lines.length; i++) {
      var ok = pick[i] === i;
      var yours = pick[i] == null || lines[pick[i]] == null ? "(empty)" : lines[pick[i]];
      rows.push({
        label: "Slot " + (i + 1),
        yours: yours,
        expected: ok ? yours : "(hidden)",
        ok: ok
      });
    }
    return rows;
  }

  function wrongOrderHtml(challenge, pick) {
    return whereLookHtml(orderMessages(challenge, pick)) + compareTableHtml(orderRows(challenge, pick));
  }

  function splitKept(text) {
    var parts = String(text || "").split("\n");
    if (parts.length && parts[parts.length - 1] === "") parts.pop();
    return parts;
  }

  function outputRows(test) {
    var rows = [];
    var expected = splitKept(test.expected);
    var got = splitKept(test.got);
    if (!expected.length) expected = [""];
    if (!got.length) got = [""];
    var n = Math.max(expected.length, got.length);
    for (var i = 0; i < n; i++) {
      var missingE = i >= expected.length;
      var missingG = i >= got.length;
      var ev = missingE ? "" : expected[i];
      var gv = missingG ? "" : got[i];
      rows.push({
        label: "Line " + (i + 1),
        yours: missingG ? "(nothing)" : gv,
        expected: missingE ? "(no line)" : ev,
        ok: !test.err && !missingE && !missingG && ev === gv
      });
    }
    if (test.err) {
      var last = String(test.err).split("\n").pop();
      rows.push({ label: "Error", yours: last, expected: "(no error)", ok: false });
    }
    return rows;
  }

  function outputMessages(test, testNumber) {
    var rows = outputRows(test);
    var first = null;
    rows.forEach(function (row) {
      if (!row.ok && !first) first = row;
    });
    var where = "Test " + testNumber + (first ? ", " + first.label.toLowerCase() : "");
    if (test.err) {
      var err = String(test.err);
      if (/NameError|not defined/i.test(err)) {
        return [
          where + " uses a name Python does not have yet.",
          "What is right: the lines that ran before this name.",
          "What is different: the name is missing or spelled differently.",
          "Where to look next: the last name in the error, then the line that should have created it."
        ];
      }
      if (/TypeError|unsupported operand/i.test(err)) {
        return [
          where + " mixes two kinds of value.",
          "What is right: each value on its own is fine.",
          "What is different: text and a number were combined with + or another operator.",
          "Where to look next: the line in the error. Use int(), float(), or str() on one side."
        ];
      }
      if (/IndentationError|expected an indented block/i.test(err)) {
        return [
          where + " stopped because of spaces.",
          "What is right: the line that ends with : is the start of a block.",
          "What is different: the next line is not indented.",
          "Where to look next: the line under if, for, or def."
        ];
      }
      if (/SyntaxError/i.test(err)) {
        return [
          where + " has a syntax problem.",
          "What is right: the lines Python accepted before this one.",
          "What is different: a quote, bracket, or colon does not match.",
          "Where to look next: the line number in the error."
        ];
      }
      return [
        where + " stopped before the print.",
        "What is right: any output above the error did run.",
        "What is different: " + (err.split("\n").pop() || "Python stopped."),
        "Where to look next: the last line of the error."
      ];
    }
    if (!first) return [];
    var yours = first.yours;
    var expected = first.expected;
    if (yours === "(nothing)" || yours === "") {
      return [
        where + " printed nothing.",
        "What is right: the lines above it match.",
        "What is different: this line is missing.",
        "Where to look next: the print for this input. It may be missing, or indented under a branch that did not run."
      ];
    }
    if (expected === "(no line)") {
      return [
        where + " has an extra line.",
        "What is right: the lines that match can stay.",
        "What is different: an extra print ran.",
        "Where to look next: a print inside the loop, or a print that should run only once."
      ];
    }
    if (String(expected).trim() === String(yours).trim()) {
      return [
        where + " differs by spaces.",
        "What is right: the words match.",
        "What is different: a space at the end or the start.",
        "Where to look next: the print for this line. Match the spacing."
      ];
    }
    if (String(expected).toLowerCase() === String(yours).toLowerCase()) {
      return [
        where + " differs by capitals.",
        "What is right: the letters match.",
        "What is different: upper and lower case are not the same to Python.",
        "Where to look next: .upper(), .lower(), or the quotes in the print."
      ];
    }
    if (expected !== "" && yours !== "" && !isNaN(Number(expected)) && !isNaN(Number(yours)) && Math.abs(Number(expected) - Number(yours)) === 1) {
      return [
        where + " is one away from the expected number.",
        "What is right: the calculation is close.",
        "What is different: the count starts at 0, or the loop stops one step early or late.",
        "Where to look next: range(...) and whether the print is inside the loop."
      ];
    }
    return [
      where + " is different.",
      "What is right: earlier lines in this test match.",
      "What is different: you printed " + yours + " and this test needs " + expected + ".",
      "Where to look next: the print for this input. Change that one piece and run again."
    ];
  }

  function codeOutputHtml(tests) {
    var passed = 0;
    var first = null;
    tests.forEach(function (test, index) {
      if (test.ok) passed += 1;
      else if (!first) first = { test: test, n: index + 1 };
    });
    var html =
      '<p class="fb">' +
      (passed === tests.length
        ? "All " + tests.length + " tests match."
        : passed + " of " + tests.length + " tests match.") +
      "</p>";
    if (first) html += whereLookHtml(outputMessages(first.test, first.n));
    tests.forEach(function (test, index) {
      html +=
        '<div class="tr ' +
        (test.ok ? "ok" : "no") +
        '">Test ' +
        (index + 1) +
        " · input: " +
        esc(test.input) +
        "</div>" +
        compareTableHtml(outputRows(test));
    });
    return html;
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
    whereLookHtml: whereLookHtml,
    compareTableHtml: compareTableHtml,
    wrongChoiceHtml: wrongChoiceHtml,
    wrongOrderHtml: wrongOrderHtml,
    choiceMessages: choiceMessages,
    orderMessages: orderMessages,
    codeOutputHtml: codeOutputHtml,
    outputMessages: outputMessages,
    codeFailHtml: codeFailHtml,
    snakeCrashHtml: snakeCrashHtml,
    protocolHtml: protocolHtml,
    recordStruggle: recordStruggle,
    resetStruggle: resetStruggle,
    encouragementHtml: encouragementHtml
  };
})(typeof window !== "undefined" ? window : this);
