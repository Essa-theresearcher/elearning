(function (global) {
  var PRACTICE = {
    predictCount: 8,
    codeCount: 5,
    sessionMinutes: "60–75",
    tagline: "Heavy daily practice: predict, code, debug, repeat."
  };

  var PROGRAM_WEEK_KEY = "pp-program-week";
  var PROG_WEEK_DONE_PREFIX = "pp-progweek-done-";

  var PROGRAM_WEEKS_META = [
    {
      n: 1,
      title: "Foundation & tracing",
      fundamentalsLabel: "Week 1",
      fundHref: "python-lesson1.html?course=python-fundamentals#reading",
      fundSections: "Setup, print(), errors — full Week 1 notes"
    },
    {
      n: 2,
      title: "Variables, strings & input",
      fundamentalsLabel: "Week 2",
      fundHref: "python-lesson2.html?course=python-fundamentals#reading",
      fundSections: "Variables, types, input(), conversion, projects"
    },
    {
      n: 3,
      title: "Decisions & logic",
      fundamentalsLabel: "Week 3",
      fundHref: "python-lesson3.html?course=python-fundamentals#reading",
      fundSections: "if/elif, grades, menus — Week 3 notes"
    },
    {
      n: 4,
      title: "Loops, data & project skills",
      fundamentalsLabel: "Week 4",
      fundHref: "python-lesson4.html?course=python-fundamentals#reading",
      fundSections: "Loops, lists, functions, capstone ideas"
    },
    {
      n: 5,
      title: "Functions, dictionaries & modules",
      fundamentalsLabel: "Week 5",
      fundHref: "python-lesson5.html?course=python-fundamentals#reading",
      fundSections: "def, return, dict, files, errors — project-ready Week 5"
    }
  ];

  var DAYS = [
    {
      dow: 0,
      short: "Sun",
      name: "Sunday",
      title: "Trace & predict variables",
      logic: "Output tracing, types, and order of lines",
      predictShift: 0,
      codeLevel: 0,
      sessionIntro: "Warm up by tracing variables line by line before you trust your first guess.",
      sessionGoals: ["8 predict challenges", "5 coding tasks", "3 visual games", "Log one tracing rule"],
      studentNotes: [
        "You are building the habit: read code slowly, one line at a time.",
        "Before each predict question, say out loud what you think each variable holds.",
        "In coding tasks, print one small result before writing the full answer.",
        "When you finish, write in Today's log: one rule about when a variable changes."
      ],
      fundamentalsLink: {
        href: "python-lesson1.html?course=python-fundamentals#reading",
        label: "Python Fundamentals · Week 1",
        sections: "Sections 1–7 (setup, print, guided practice)"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Snake chase", hint: "Score 3 apples — follow the food.", winScore: 3, variant: 0 },
        { id: "maze", label: "Intermediate · Open maze", hint: "Reach the star (80 steps max).", variant: 0 },
        { id: "sudoku", label: "Advanced · Row & column rules", hint: "Check the row or column that repeats a number.", variant: 0 }
      ]
    },
    {
      dow: 1,
      short: "Mon",
      name: "Monday",
      title: "Strings & small bugs",
      logic: "Text vs numbers, fix-the-bug drills, input() traps",
      predictShift: 4,
      codeLevel: 0,
      sessionIntro:
        "Today’s theme: strings are not numbers. Drill quotes, concatenation, input(), and small bugs.",
      sessionGoals: [
        "8 predict items (string + bug focus)",
        "5 beginner coding tasks (text & input)",
        "3 visual stages: Beginner, then Intermediate, then Advanced",
        "In Today's log: one sentence on text vs int"
      ],
      studentNotes: [
        "Look for quotes: '5' is text, 5 is a number — they behave differently with + and input().",
        "On fix-the-bug items, find the first line where text and numbers are mixed wrongly.",
        "Coding today is beginner level: names, joining words, and simple input — take your time.",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      fundamentalsLink: {
        href: "python-lesson1.html?course=python-fundamentals#reading",
        label: "Python Fundamentals · Week 1",
        sections: "print() and error reading; Week 2 preview in Fundamentals when ready"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Corner snake", hint: "Score 4 apples without crashing.", winScore: 4, variant: 1 },
        { id: "maze", label: "Intermediate · Tight corridors", hint: "Reach the star in 60 steps.", variant: 1 },
        { id: "sudoku", label: "Advanced · Box checker", hint: "Check the 3×3 box when a number repeats.", variant: 1 }
      ]
    },
    {
      dow: 2,
      short: "Tue",
      name: "Tuesday",
      title: "Loops & repetition",
      logic: "for/range and repeating patterns",
      predictShift: 8,
      codeLevel: 1,
      sessionIntro: "Loops repeat work — predict what the counter does before you run code in your head.",
      sessionGoals: ["8 predict challenges", "5 intermediate coding tasks", "3 visual games", "Log one loop pattern"],
      studentNotes: [
        "Write the first three values the counter takes (often 0, 1, 2).",
        "Ask: does this line run once or many times?",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      fundamentalsLink: {
        href: "python-lesson1.html?course=python-fundamentals#reading",
        label: "Python Fundamentals · Week 1",
        sections: "Finish Week 1 lab; loops come in Fundamentals Week 4"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Tail watch", hint: "Score 5 apples — avoid your body.", winScore: 5, variant: 2 },
        { id: "maze", label: "Intermediate · Long path", hint: "Reach the star in 100 steps.", variant: 2 },
        { id: "sudoku", label: "Advanced · Repeat the rules", hint: "Fix one repeated number, then check again.", variant: 2 }
      ]
    },
    {
      dow: 3,
      short: "Wed",
      name: "Wednesday",
      title: "Decisions & grades",
      logic: "if/elif/else reasoning",
      predictShift: 2,
      codeLevel: 1,
      sessionIntro: "Decision trees: only one branch runs — practice reading conditions in order.",
      sessionGoals: ["8 predict challenges", "5 coding tasks", "3 visual games", "Log one if/elif rule"],
      studentNotes: [
        "Read if / elif / else from top to bottom — stop at the first True condition.",
        "Grade questions mirror real pass marks and limits.",
        "Change one condition at a time when debugging."
      ],
      fundamentalsLink: {
        href: "python-lesson1.html?course=python-fundamentals#reading",
        label: "Python Fundamentals",
        sections: "Week 3 notes when you unlock Practical Week 3"
      },
      visualGames: [
        { id: "snake", label: "Beginner · If/else chase", hint: "Score 3 apples with smart turns.", winScore: 3, variant: 3 },
        { id: "maze", label: "Intermediate · Wall choices", hint: "Use hit_wall before every move.", variant: 3 },
        { id: "sudoku", label: "Advanced · Where to look", hint: "The coach tells you where to look and why.", variant: 3 }
      ]
    },
    {
      dow: 4,
      short: "Thu",
      name: "Thursday",
      title: "Lists & data",
      logic: "Lists, len, append, dictionaries intro",
      predictShift: 10,
      codeLevel: 2,
      sessionIntro: "Lists and dicts hold data — track what changes after append and key lookups.",
      sessionGoals: ["8 predict challenges", "5 advanced-leaning tasks", "3 visual games", "Log one data-structure tip"],
      studentNotes: [
        "Draw the list after each append — predict items love len() and last index.",
        "For dicts: say the key, then the value it maps to.",
        "Read each coding test’s expected output before you edit code."
      ],
      fundamentalsLink: {
        href: "python-lesson4.html?course=python-fundamentals#reading",
        label: "Python Fundamentals · Week 4",
        sections: "Section 9 (lists) — unlocks fully in Practical Week 4"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Body list", hint: "Score 4 — body grows like append.", winScore: 4, variant: 4 },
        { id: "maze", label: "Intermediate · Data path", hint: "Track steps like a list counter.", variant: 4 },
        { id: "sudoku", label: "Advanced · Cell by cell", hint: "Crosses show cells that differ.", variant: 4 }
      ]
    },
    {
      dow: 5,
      short: "Fri",
      name: "Friday",
      title: "Functions & APIs",
      logic: "Return values, small functions, JSON-style dicts",
      predictShift: 12,
      codeLevel: 2,
      sessionIntro: "Functions return values — predict None vs a number before you call code.",
      sessionGoals: ["8 predict challenges", "5 coding tasks", "3 visual games", "Log one return-value mistake"],
      studentNotes: [
        "No return means None — watch for that in predict items.",
        "Nested dicts are boxes inside boxes.",
        "Finish all coding tests — edge cases matter."
      ],
      fundamentalsLink: {
        href: "python-lesson4.html?course=python-fundamentals#reading",
        label: "Python Fundamentals · Week 4",
        sections: "Section 10 (functions & return)"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Score function", hint: "Score 5 to finish strong.", winScore: 5, variant: 5 },
        { id: "maze", label: "Intermediate · choose_direction API", hint: "Return a direction string.", variant: 5 },
        { id: "sudoku", label: "Advanced · Three hints", hint: "Hints name groups and numbers.", variant: 5 }
      ]
    },
    {
      dow: 6,
      short: "Sat",
      name: "Saturday",
      title: "Weekly mix & review",
      logic: "Mixed predict + code from the week",
      predictShift: 6,
      codeLevel: 1,
      sessionIntro: "Review week — mixed skills. Speed comes from reps, not rushing.",
      sessionGoals: ["8 mixed predict items", "5 coding tasks", "3 visual review games", "Log your strongest skill"],
      studentNotes: [
        "Review day — use mistakes to see what to revisit in Fundamentals notes.",
        "Work Predict → Code → Visual, then mark the day complete.",
        "Completing all 7 days unlocks the next Practical program week."
      ],
      fundamentalsLink: {
        href: "python-lesson1.html?course=python-fundamentals#reading",
        label: "Python Fundamentals",
        sections: "Re-read the week that matches your Practical program week"
      },
      visualGames: [
        { id: "snake", label: "Beginner · Review snake", hint: "Score 3 — warm up.", winScore: 3, variant: 6 },
        { id: "maze", label: "Intermediate · Review maze", hint: "Reach the star in 70 steps.", variant: 6 },
        { id: "sudoku", label: "Advanced · Review sudoku", hint: "Check first. Hints cost stars.", variant: 6 }
      ]
    }
  ];

  function cloneDay(day) {
    return JSON.parse(JSON.stringify(day));
  }

  function defaultFundLink(meta, sections) {
    return {
      href: meta.fundHref,
      label: "Python Fundamentals · " + meta.fundamentalsLabel,
      sections: sections || meta.fundSections
    };
  }

  function buildProgramWeek(weekNum, meta, patches) {
    return DAYS.map(function (base, i) {
      var d = cloneDay(base);
      var p = patches[i] || {};
      if (p.title) d.title = p.title;
      if (p.logic) d.logic = p.logic;
      if (p.sessionIntro) d.sessionIntro = p.sessionIntro;
      if (p.sessionGoals) d.sessionGoals = p.sessionGoals;
      if (p.studentNotes) d.studentNotes = p.studentNotes;
      if (p.fundamentalsLink) d.fundamentalsLink = p.fundamentalsLink;
      else if (meta) d.fundamentalsLink = defaultFundLink(meta, p.fundSections);
      if (p.visualGames) d.visualGames = p.visualGames;
      if (p.predictShift != null) d.predictShift = p.predictShift;
      if (p.codeLevel != null) d.codeLevel = p.codeLevel;
      d.predictShift = d.predictShift + (weekNum - 1) * 18;
      d.programWeek = weekNum;
      d.weekTitle = meta.title;
      if (p.visualVariantOffset) {
        d.visualGames = d.visualGames.map(function (g) {
          return Object.assign({}, g, { variant: (g.variant || 0) + p.visualVariantOffset });
        });
      }
      return d;
    });
  }

  var WEEK2_PATCHES = [
    {
      title: "Variable tracing (Week 2 focus)",
      logic: "Types, reassignment, and predict output",
      predictShift: 1,
      fundSections: "§1–2 variables & types, §7 tracing",
      studentNotes: [
        "Practical Week 2 pairs with Fundamentals Week 2.",
        "Track every variable after each = line.",
        "Say the type out loud when you see quotes vs bare numbers."
      ]
    },
    {
      title: "input() & conversion drills",
      logic: "Text from input, int/float for math",
      predictShift: 5,
      fundSections: "§3–5 input and conversion",
      studentNotes: [
        "input() is always str until you convert.",
        "Fix-the-bug: find str + int before you change code."
      ]
    },
    {
      title: "f-strings & receipt math",
      logic: "Formatting output, VAT-style calculations",
      predictShift: 9,
      codeLevel: 1,
      fundSections: "§6 f-strings, §10 receipt project",
      studentNotes: ["Build one line of output at a time.", "Use float for money when needed."]
    },
    {
      title: "Decisions warm-up",
      logic: "if/else before full Week 3",
      predictShift: 3,
      codeLevel: 1,
      fundSections: "Week 3 preview — comparisons",
      studentNotes: ["One branch runs. Trace True/False before each print."]
    },
    {
      title: "Lists intro (data rows)",
      logic: "len, append, index -1",
      predictShift: 11,
      codeLevel: 1,
      fundSections: "Week 4 §9 lists (preview)",
      studentNotes: ["After append, len grows by 1.", "Last item: lst[-1]"]
    },
    {
      title: "Week 2 coding project reps",
      logic: "Receipt or age calculator patterns",
      predictShift: 13,
      codeLevel: 1,
      fundSections: "Week 2 activity Phase D",
      studentNotes: ["Combine input + f-string + one formula.", "Test with sample numbers you know."]
    },
    {
      title: "Practical Week 2 review",
      logic: "Mixed variables, strings, input",
      predictShift: 7,
      sessionIntro: "Review Practical Week 2 — finish all 7 days to unlock Week 3.",
      fundSections: "Full Week 2 notes + activity"
    }
  ];

  var WEEK3_PATCHES = [
    {
      title: "Comparison tracing (deep)",
      logic: "==, !=, <, > and boolean results — 20 paper traces",
      predictShift: 0,
      fundSections: "Week 3 §0–2, practice bank 17",
      sessionIntro:
        "Program Week 3 · Sunday: treat every predict like an exam. Open Fundamentals Week 3 expanded notes sections 1–2.",
      sessionGoals: [
        "8 predict (comparison heavy)",
        "5 code tasks",
        "3 visual games",
        "Notebook: 10 True/False traces without running code"
      ],
      studentNotes: [
        "Use = only for assignment; == for comparison — say it aloud before each answer.",
        "Section 1 Predict set A: complete all five on paper first.",
        "If stuck, re-read Week 3 notes section 0 (mindset) and Week 2 input conversion.",
        "Log one mistake type in Today's log (wrong operator vs wrong type)."
      ],
      visualVariantOffset: 7
    },
    {
      title: "if / else programs",
      logic: "Two-branch decisions + indent drills",
      predictShift: 4,
      codeLevel: 1,
      fundSections: "Week 3 §3–4, practice bank 18 (items 1–5)",
      sessionIntro: "Monday: write small if/else files — one concept per file.",
      studentNotes: [
        "Practice 3.1–3.8 in expanded notes — aim for at least four today.",
        "Indentation: four spaces; else aligns with if.",
        "Run Fix-it drills 4.1–4.5 once this week."
      ]
    },
    {
      title: "elif grade ladders",
      logic: "Ordered thresholds, one winner",
      predictShift: 8,
      codeLevel: 1,
      fundSections: "Week 3 §5–6, practice bank 19 (items 1–5)",
      sessionIntro: "Tuesday: grade ladders — trace mark 72 before coding.",
      studentNotes: [
        "Put highest grade threshold first (≥80 before ≥60).",
        "Complete worked example section 6 table for marks 80, 60, 59.",
        "Build Kenyan A–F ladder from practice bank 19.1."
      ]
    },
    {
      title: "Decisions + input (Wednesday focus)",
      logic: "Login checks, ticket prices, even/odd, guards",
      predictShift: 2,
      codeLevel: 1,
      fundSections: "Week 3 §9–11, §15, Practical map §22",
      sessionIntro:
        "Wednesday matches Fundamentals decision week — grades, gates, and input validation.",
      sessionGoals: [
        "8 predict (if/elif chains)",
        "5 coding (intermediate)",
        "3 visual stages",
        "Start menu project outline (section 13)"
      ],
      studentNotes: [
        "Convert input before comparing numbers (Week 2).",
        "Guard clause pattern section 10 — reject empty input first.",
        "Menu project: four options + quit + invalid choice handler.",
        "Paper tracing marathon section 21 — pick one program, three inputs."
      ]
    },
    {
      title: "and / or / not",
      logic: "Real gates — membership, payment, age",
      predictShift: 10,
      codeLevel: 2,
      fundSections: "Week 3 §7–8, practice bank 20",
      sessionIntro: "Thursday: combine facts with and/or/not; truth tables on paper.",
      studentNotes: [
        "Practice 7.1–7.10 across the week — do at least three today.",
        "Security-style checks use AND (user and password both correct).",
        "Try flattening nested if to and (section 12)."
      ]
    },
    {
      title: "Menu project build day",
      logic: "if/elif chain — portfolio piece",
      predictShift: 12,
      codeLevel: 2,
      fundSections: "Week 3 §13–14, §25 rules engine preview",
      sessionIntro: "Friday: ship menu project v1 — comments, four options, one nested input branch.",
      studentNotes: [
        "Phase C requirements in section 13 — check each bullet before submit.",
        "Optional: rules_engine.py from section 25 for stretch.",
        "Save in folder week3_work/ for your portfolio."
      ]
    },
    {
      title: "Practical Week 3 review & banks",
      logic: "Mixed decisions — unlock Week 4 after 7 days",
      predictShift: 6,
      codeLevel: 2,
      sessionIntro:
        "Saturday: review banks 17–20, self-quiz section 24, finish unfinished menu project.",
      sessionGoals: [
        "Complete any missing day from Sun–Fri",
        "8 predict review mix",
        "5 code review",
        "3 visual games"
      ],
      studentNotes: [
        "Self-quiz section 24 — 20 questions without notes.",
        "Extra challenges section 29 — pick one.",
        "When 7/7 days done, Program Week 4 unlocks (loops)."
      ],
      fundSections: "Full expanded Week 3 notes (sections 0–30)"
    }
  ];

  var WEEK4_PATCHES = [
    {
      title: "Loop output tracing",
      logic: "while/for predict, counter values",
      predictShift: 1,
      fundSections: "Week 4 §2–3 loops",
      visualVariantOffset: 14
    },
    {
      title: "while loops & counters",
      logic: "Stop conditions, avoid infinite loops",
      predictShift: 5,
      codeLevel: 1,
      fundSections: "Week 4 §2"
    },
    {
      title: "for, range, accumulators",
      logic: "Sums, tables, counted repetition",
      predictShift: 9,
      codeLevel: 2,
      fundSections: "Week 4 §3–4"
    },
    {
      title: "Loops + decisions",
      logic: "Guessing game patterns",
      predictShift: 3,
      codeLevel: 2,
      fundSections: "Week 4 §6"
    },
    {
      title: "Lists & loops together",
      logic: "for item in list, tallies",
      predictShift: 11,
      codeLevel: 2,
      fundSections: "Week 4 §9"
    },
    {
      title: "Functions & mini projects",
      logic: "def, return, split problem into steps",
      predictShift: 13,
      codeLevel: 2,
      fundSections: "Week 4 §8–10 capstone",
      studentNotes: [
        "Project week: guessing game, fee total, or quiz score tracker.",
        "Use functions to keep main code readable."
      ]
    },
    {
      title: "Practical Week 4 capstone review",
      logic: "Full mix — project-ready reps",
      predictShift: 7,
      codeLevel: 2,
      sessionIntro: "Final Practical week — combine loops, data, and functions into one small project idea.",
      fundSections: "Week 4 §11 Practical map + portfolio project"
    }
  ];

  var WEEK5_PATCHES = [
    {
      title: "def / return fundamentals",
      logic: "Split programs into reusable functions",
      predictShift: 0,
      fundSections: "Week 5 §1–4 functions",
      sessionIntro: "Program Week 5: every coding task should call at least one function you wrote.",
      studentNotes: [
        "One function = one job (calculate, format, validate).",
        "Use return to send a value back; print is not return.",
        "Open Fundamentals Week 5 notes — sections 1–4 today."
      ],
      visualVariantOffset: 21
    },
    {
      title: "Parameters & scope",
      logic: "Arguments, defaults, local vs global",
      predictShift: 4,
      codeLevel: 2,
      fundSections: "Week 5 §5–7"
    },
    {
      title: "Dictionaries — records & lookup",
      logic: "Keys, values, get, update",
      predictShift: 8,
      codeLevel: 2,
      fundSections: "Week 5 §8–12 dicts",
      studentNotes: [
        "Model a student or product as a dict — real project pattern.",
        "Loop .items() for reports."
      ]
    },
    {
      title: "Dict + function projects",
      logic: "Inventory, phonebook, fee ledger",
      predictShift: 2,
      codeLevel: 2,
      fundSections: "Week 5 §13–16 project bank"
    },
    {
      title: "Files & persistence",
      logic: "open, read, write, with statement",
      predictShift: 10,
      codeLevel: 2,
      fundSections: "Week 5 §17–19 files"
    },
    {
      title: "Errors & try/except",
      logic: "Graceful failure, int conversion",
      predictShift: 12,
      codeLevel: 2,
      fundSections: "Week 5 §20–22 exceptions"
    },
    {
      title: "Week 5 capstone review",
      logic: "Mini app: menu + dict + functions + file",
      predictShift: 6,
      codeLevel: 3,
      sessionIntro: "Final Practical week — combine Week 3–5 into one small app you own.",
      fundSections: "Week 5 §23–28 capstone & expert path"
    }
  ];

  var PROGRAM_WEEK_DAYS = [
    DAYS,
    buildProgramWeek(2, PROGRAM_WEEKS_META[1], WEEK2_PATCHES),
    buildProgramWeek(3, PROGRAM_WEEKS_META[2], WEEK3_PATCHES),
    buildProgramWeek(4, PROGRAM_WEEKS_META[3], WEEK4_PATCHES),
    buildProgramWeek(5, PROGRAM_WEEKS_META[4], WEEK5_PATCHES)
  ];

  function getProgramWeek() {
    try {
      var w = parseInt(localStorage.getItem(PROGRAM_WEEK_KEY) || "1", 10);
      if (w < 1 || w > 5) return 1;
      return w;
    } catch (e) {
      return 1;
    }
  }

  function setProgramWeek(n) {
    var w = Math.max(1, Math.min(5, n));
    try {
      localStorage.setItem(PROGRAM_WEEK_KEY, String(w));
    } catch (e) {}
    return w;
  }

  function isProgramWeekUnlocked(n) {
    if (n <= 1) return true;
    try {
      return localStorage.getItem(PROG_WEEK_DONE_PREFIX + (n - 1)) === "1";
    } catch (e) {
      return false;
    }
  }

  function markProgramWeekDone(n) {
    try {
      localStorage.setItem(PROG_WEEK_DONE_PREFIX + n, "1");
    } catch (e) {}
  }

  function countDoneDaysForProgramWeek(weekNum) {
    var count = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf("pp-day-") !== 0) continue;
        var rec = JSON.parse(localStorage.getItem(k) || "{}");
        if (!rec.done) continue;
        if (rec.programWeek === weekNum) count++;
        else if (!rec.programWeek && weekNum === 1) count++;
      }
    } catch (e) {}
    return count;
  }

  function tryAdvanceProgramWeek() {
    var w = getProgramWeek();
    if (countDoneDaysForProgramWeek(w) < 7) return w;
    markProgramWeekDone(w);
    if (w < 5) return setProgramWeek(w + 1);
    return w;
  }

  function getDaysForProgramWeek(weekNum) {
    var idx = Math.max(1, Math.min(5, weekNum)) - 1;
    return PROGRAM_WEEK_DAYS[idx] || DAYS;
  }

  function planForDate(d, programWeek) {
    var pw = programWeek || getProgramWeek();
    var days = getDaysForProgramWeek(pw);
    var idx = d.getDay();
    var base = days[idx] || days[0];
    var meta = PROGRAM_WEEKS_META[pw - 1] || PROGRAM_WEEKS_META[0];
    return Object.assign({}, PRACTICE, { programWeek: pw, weekTitle: meta.title }, base);
  }

  function visualOrderString(plan) {
    return (plan.visualGames || []).map(function (g) {
      return g.id;
    }).join(",");
  }

  function visualSummary(plan) {
    return (plan.visualGames || [])
      .map(function (g) {
        return g.label.split(" · ")[0];
      })
      .join(" → ");
  }

  function practiceSummary(plan) {
    return (
      (plan.predictCount || 8) +
      " predict · " +
      (plan.codeCount || 5) +
      " code · " +
      (plan.visualGames ? plan.visualGames.length : 3) +
      " visual"
    );
  }

  global.WeeklyContent = {
    PRACTICE: PRACTICE,
    DAYS: DAYS,
    PROGRAM_WEEKS_META: PROGRAM_WEEKS_META,
    getProgramWeek: getProgramWeek,
    setProgramWeek: setProgramWeek,
    isProgramWeekUnlocked: isProgramWeekUnlocked,
    tryAdvanceProgramWeek: tryAdvanceProgramWeek,
    countDoneDaysForProgramWeek: countDoneDaysForProgramWeek,
    getDaysForProgramWeek: getDaysForProgramWeek,
    planForDate: planForDate,
    visualOrderString: visualOrderString,
    visualSummary: visualSummary,
    practiceSummary: practiceSummary
  };
})(typeof window !== "undefined" ? window : this);
