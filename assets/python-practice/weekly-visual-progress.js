(function (global) {
  function storageKey(dbaDate) {
    return "pp-wv-" + dbaDate;
  }

  function read(dbaDate) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(dbaDate)) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function write(dbaDate, data) {
    try {
      localStorage.setItem(storageKey(dbaDate), JSON.stringify(data));
    } catch (e) {}
  }

  function parseOrder(qp) {
    var raw = qp && qp.get ? qp.get("dbaVisualOrder") : "";
    if (!raw) return ["snake", "maze", "sudoku"];
    return raw.split(",").map(function (s) {
      return s.trim();
    }).filter(Boolean);
  }

  function isDone(dbaDate, gameId) {
    return Boolean(read(dbaDate)[gameId]);
  }

  function isUnlocked(dbaDate, gameId, order) {
    order = order || ["snake", "maze", "sudoku"];
    var idx = order.indexOf(gameId);
    if (idx <= 0) return true;
    return isDone(dbaDate, order[idx - 1]);
  }

  function allDone(dbaDate, order) {
    order = order || ["snake", "maze", "sudoku"];
    return order.every(function (g) {
      return isDone(dbaDate, g);
    });
  }

  function markGame(dbaDate, gameId, order) {
    if (!dbaDate || !gameId) return;
    order = order || ["snake", "maze", "sudoku"];
    var data = read(dbaDate);
    data[gameId] = true;
    write(dbaDate, data);
    function broadcast(data) {
      try {
        if (global.top && global.top !== global) global.top.postMessage(data, "*");
      } catch (e) {}
      try {
        if (global.parent && global.parent !== global) global.parent.postMessage(data, "*");
      } catch (e2) {}
    }
    broadcast({
      type: "pp-weekly-visual-game",
      date: dbaDate,
      game: gameId,
      allDone: allDone(dbaDate, order)
    });
    if (allDone(dbaDate, order)) {
      broadcast({ type: "pp-day-task", task: "visual", date: dbaDate });
    }
  }

  global.WeeklyVisualProgress = {
    read: read,
    isDone: isDone,
    isUnlocked: isUnlocked,
    allDone: allDone,
    markGame: markGame,
    parseOrder: parseOrder
  };
})(typeof window !== "undefined" ? window : this);
