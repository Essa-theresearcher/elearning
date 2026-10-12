(function (global) {
  var PRACTICE = {
    predictCount: 8,
    codeCount: 5,
    sessionMinutes: "60–75",
    tagline: "Heavy daily practice: predict, code, debug, repeat."
  };

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
      visualGames: [
        { id: "snake", label: "1 · Snake chase", hint: "Score 3 apples — follow the food.", winScore: 3, variant: 0 },
        { id: "maze", label: "2 · Open maze", hint: "Reach the star (80 steps max).", variant: 0 },
        { id: "sudoku", label: "3 · Row & column rules", hint: "Pass all is_safe tests.", variant: 0 }
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
        "Session · Mon 12 Oct — Strings are not numbers. Today you drill quotes, concatenation, input(), and fix-the-bug items until the pattern feels automatic.",
      sessionGoals: [
        "8 predict items (string + bug focus)",
        "5 beginner coding tasks (text & input)",
        "3 visual games: Maze → Snake → Sudoku",
        "In Today's log: one sentence on text vs int"
      ],
      visualGames: [
        { id: "maze", label: "1 · Tight corridors", hint: "Reach the star in 60 steps.", variant: 1 },
        { id: "snake", label: "2 · Corner snake", hint: "Score 4 apples without crashing.", winScore: 4, variant: 1 },
        { id: "sudoku", label: "3 · Box checker", hint: "Includes an extra 2×2 box test.", variant: 1 }
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
      visualGames: [
        { id: "sudoku", label: "1 · Repeat the rules", hint: "Loop-friendly safety checks.", variant: 2 },
        { id: "snake", label: "2 · Tail watch", hint: "Score 5 apples — avoid your body.", winScore: 5, variant: 2 },
        { id: "maze", label: "3 · Long path", hint: "Reach the star in 100 steps.", variant: 2 }
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
      visualGames: [
        { id: "snake", label: "1 · If/else chase", hint: "Score 3 apples with smart turns.", winScore: 3, variant: 3 },
        { id: "sudoku", label: "2 · Decision grid", hint: "Fail cases need elif-style thinking.", variant: 3 },
        { id: "maze", label: "3 · Wall choices", hint: "Use hit_wall before every move.", variant: 3 }
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
      visualGames: [
        { id: "maze", label: "1 · Data path", hint: "Track steps like a list counter.", variant: 4 },
        { id: "sudoku", label: "2 · Grid as lists", hint: "Think rows as list indexes.", variant: 4 },
        { id: "snake", label: "3 · Body list", hint: "Score 4 — body grows like append.", winScore: 4, variant: 4 }
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
      visualGames: [
        { id: "sudoku", label: "1 · Function tests", hint: "Return True/False from is_safe.", variant: 5 },
        { id: "maze", label: "2 · choose_direction API", hint: "Return a direction string.", variant: 5 },
        { id: "snake", label: "3 · Score function", hint: "Score 5 to finish strong.", winScore: 5, variant: 5 }
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
      sessionIntro: "Review week — mixed types, loops, decisions, and data. Speed comes from reps.",
      sessionGoals: ["8 mixed predict items", "5 coding tasks", "3 visual review games", "Log your strongest skill this week"],
      visualGames: [
        { id: "snake", label: "1 · Review snake", hint: "Score 3 — warm up.", winScore: 3, variant: 6 },
        { id: "maze", label: "2 · Review maze", hint: "Reach the star in 70 steps.", variant: 6 },
        { id: "sudoku", label: "3 · Review sudoku", hint: "All tests from the week combined.", variant: 6 }
      ]
    }
  ];

  function planForDate(d) {
    var idx = d.getDay();
    var base = DAYS[idx] || DAYS[0];
    return Object.assign({}, PRACTICE, base);
  }

  function visualOrderString(plan) {
    return (plan.visualGames || []).map(function (g) {
      return g.id;
    }).join(",");
  }

  function visualSummary(plan) {
    return (plan.visualGames || [])
      .map(function (g) {
        return g.label.replace(/^\d+\s·\s/, "");
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
    planForDate: planForDate,
    visualOrderString: visualOrderString,
    visualSummary: visualSummary,
    practiceSummary: practiceSummary
  };
})(typeof window !== "undefined" ? window : this);
