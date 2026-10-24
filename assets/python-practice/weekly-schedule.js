(function (global) {
  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function dateKey(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function weekStartSunday(d) {
    var x = startOfDay(d || new Date());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }

  function weekDates(anchor) {
    var start = weekStartSunday(anchor);
    var out = [];
    for (var i = 0; i < 7; i++) {
      var x = new Date(start);
      x.setDate(start.getDate() + i);
      out.push(x);
    }
    return out;
  }

  function recordKey(d) {
    return "pp-day-" + dateKey(d);
  }

  function lockKey(d) {
    return "pp-locked-" + dateKey(d);
  }

  function getRecord(d) {
    try {
      return JSON.parse(localStorage.getItem(recordKey(d)) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  function saveRecord(d, record) {
    try {
      localStorage.setItem(recordKey(d), JSON.stringify(record));
    } catch (e) {}
  }

  function isDone(d) {
    return Boolean(getRecord(d).done);
  }

  function isLocked(d) {
    return localStorage.getItem(lockKey(d)) === "1";
  }

  function lockDay(d) {
    try {
      localStorage.setItem(lockKey(d), "1");
    } catch (e) {}
  }

  function syncLocks() {
    var today = startOfDay(new Date());
    weekDates(today).forEach(function (d) {
      if (d < today && !isDone(d)) {
        lockDay(d);
      }
    });
  }

  function dayOfWeekIndex(d) {
    return d.getDay();
  }

  function isFuture(d) {
    return startOfDay(d) > startOfDay(new Date());
  }

  function isAccessible(d) {
    syncLocks();
    var day = startOfDay(d);
    var today = startOfDay(new Date());
    if (isFuture(day)) return false;
    if (isLocked(day)) return false;
    var dates = weekDates(today);
    for (var i = 0; i < dates.length; i++) {
      var prior = dates[i];
      if (dateKey(prior) === dateKey(day)) break;
      if (prior >= today) break;
      if (!isDone(prior) && !isLocked(prior)) {
        return false;
      }
    }
    return true;
  }

  function status(d) {
    syncLocks();
    if (isFuture(d)) return "future";
    if (isLocked(d)) return "missed";
    if (isDone(d)) return "done";
    if (dateKey(d) === dateKey(new Date())) return "today";
    if (startOfDay(d) < startOfDay(new Date())) return "missed";
    return "open";
  }

  function markTask(d, task) {
    var r = getRecord(d);
    r[task] = true;
    saveRecord(d, r);
  }

  function tasksComplete(d) {
    var r = getRecord(d);
    return Boolean(r.predict && r.code && r.visual);
  }

  function markDone(d, programWeek) {
    var r = getRecord(d);
    r.predict = true;
    r.code = true;
    r.visual = true;
    r.done = true;
    r.completedAt = new Date().toISOString();
    if (programWeek != null) {
      r.programWeek = programWeek;
    }
    saveRecord(d, r);
  }

  function weekLabel(anchor) {
    var dates = weekDates(anchor);
    var a = dates[0];
    var b = dates[6];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[a.getMonth()] + " " + a.getDate() + " – " + months[b.getMonth()] + " " + b.getDate() + ", " + b.getFullYear();
  }

  global.WeeklySchedule = {
    dateKey: dateKey,
    weekDates: weekDates,
    weekStartSunday: weekStartSunday,
    weekLabel: weekLabel,
    dayOfWeekIndex: dayOfWeekIndex,
    getRecord: getRecord,
    isDone: isDone,
    isLocked: isLocked,
    isAccessible: isAccessible,
    status: status,
    markTask: markTask,
    tasksComplete: tasksComplete,
    markDone: markDone,
    syncLocks: syncLocks
  };
})(typeof window !== "undefined" ? window : this);
