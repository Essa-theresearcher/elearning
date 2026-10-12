(function (global) {
  var KEY = "pp-visual-progress";
  var ORDER = ["snake", "maze", "sudoku"];

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function write(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function isDone(game) {
    return Boolean(read()[game]);
  }

  function isUnlocked(game) {
    var idx = ORDER.indexOf(game);
    if (idx <= 0) return true;
    return isDone(ORDER[idx - 1]);
  }

  function markDone(game) {
    var data = read();
    data[game] = true;
    write(data);
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage({ type: "pp-visual-done", game: game }, "*");
      }
    } catch (e) {}
  }

  function allDone() {
    return ORDER.every(isDone);
  }

  global.VisualProgress = {
    ORDER: ORDER,
    isDone: isDone,
    isUnlocked: isUnlocked,
    markDone: markDone,
    allDone: allDone,
    read: read
  };
})(typeof window !== "undefined" ? window : this);
