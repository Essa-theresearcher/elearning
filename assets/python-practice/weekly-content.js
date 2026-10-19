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
      studentNotes: [
        "You are building the habit: read code slowly, one line at a time.",
        "Before each predict question, say out loud what you think each variable holds.",
        "In coding tasks, print one small result before writing the full answer.",
        "When you finish, write in Today's log: one rule about when a variable changes."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Snake chase", hint: "Score 3 apples — follow the food.", winScore: 3, variant: 0 },
        { id: "maze", label: "Intermediate · Open maze", hint: "Reach the star (80 steps max).", variant: 0 },
        { id: "sudoku", label: "Advanced · Row & column rules", hint: "Check names the row or column that repeats a number.", variant: 0 }
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
        "Today’s theme: strings are not numbers. You will drill quotes, concatenation, input(), and small bugs until the pattern feels automatic.",
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
        "Visual stages always run Beginner, then Intermediate, then Advanced. Finish each stage before the next tab unlocks.",
        "If you feel stuck, use the coach steps; hints cost stars, so try one full attempt first."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Corner snake", hint: "Score 4 apples without crashing.", winScore: 4, variant: 1 },
        { id: "maze", label: "Intermediate · Tight corridors", hint: "Reach the star in 60 steps.", variant: 1 },
        { id: "sudoku", label: "Advanced · Box checker", hint: "Check names the 3×3 box when a number is repeated.", variant: 1 }
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
        "For every loop question, write the first three values the counter takes (often 0, 1, 2).",
        "Coding level is intermediate today — loops, grades, and strings together.",
        "Ask yourself: does this line run once or many times? That is the heart of loops.",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Tail watch", hint: "Score 5 apples — avoid your body.", winScore: 5, variant: 2 },
        { id: "maze", label: "Intermediate · Long path", hint: "Reach the star in 100 steps.", variant: 2 },
        { id: "sudoku", label: "Advanced · Repeat the rules", hint: "New grid. Fix one repeated number, then check again.", variant: 2 }
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
        "Read if / elif / else from top to bottom — stop at the first condition that is True.",
        "Grade and comparison questions are training for real-world rules (pass marks, limits).",
        "When code fails tests, change one condition at a time, then run again.",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · If/else chase", hint: "Score 3 apples with smart turns.", winScore: 3, variant: 3 },
        { id: "maze", label: "Intermediate · Wall choices", hint: "Use hit_wall before every move.", variant: 3 },
        { id: "sudoku", label: "Advanced · Where to look", hint: "The first problem tells you where to look and why.", variant: 3 }
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
        "Draw the list on paper after each append — predict questions love len() and last item.",
        "For dictionaries, say the key aloud, then what value it points to.",
        "Coding is tougher today; read each test’s expected output before you edit code.",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Body list", hint: "Score 4 — body grows like append.", winScore: 4, variant: 4 },
        { id: "maze", label: "Intermediate · Data path", hint: "Track steps like a list counter.", variant: 4 },
        { id: "sudoku", label: "Advanced · Cell by cell", hint: "Crosses show every cell that differs. The answer stays hidden.", variant: 4 }
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
        "If you do not see return in a function, the result is None — watch for that in predict items.",
        "Nested dicts (data['key']['inner']) are like opening boxes inside boxes.",
        "Finish functions in coding tasks before moving on — tests check edge cases.",
        "Visual stages run Beginner, then Intermediate, then Advanced."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Score function", hint: "Score 5 to finish strong.", winScore: 5, variant: 5 },
        { id: "maze", label: "Intermediate · choose_direction API", hint: "Return a direction string.", variant: 5 },
        { id: "sudoku", label: "Advanced · Three hints", hint: "Hint 1 names a group. Hint 3 names one number.", variant: 5 }
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
      studentNotes: [
        "This is review day — mistakes are normal; use them to see what to revise next week.",
        "Skim your Today's log from earlier days if you kept one — notice what improved.",
        "Work in order: Predict → Code → Visual games, then mark the day complete.",
        "Replay any quest for extra practice after you finish once."
      ],
      visualGames: [
        { id: "snake", label: "Beginner · Review snake", hint: "Score 3 — warm up.", winScore: 3, variant: 6 },
        { id: "maze", label: "Intermediate · Review maze", hint: "Reach the star in 70 steps.", variant: 6 },
        { id: "sudoku", label: "Advanced · Review sudoku", hint: "Review: Check first. Hints cost stars.", variant: 6 }
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
    planForDate: planForDate,
    visualOrderString: visualOrderString,
    visualSummary: visualSummary,
    practiceSummary: practiceSummary
  };
})(typeof window !== "undefined" ? window : this);
