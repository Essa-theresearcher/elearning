(function (global) {
  var STORAGE_KEY = "dba-site-lang";
  var SUPPORTED = { en: true, so: true };
  var readingCache = {};
  var readingEnSnapshot = null;

  function getStrings() {
    return global.DBA_UI_STRINGS || { en: {}, so: {} };
  }

  function normalizeLang(lang) {
    var code = (lang || "").toLowerCase().slice(0, 2);
    return SUPPORTED[code] ? code : "en";
  }

  function getLang() {
    try {
      return normalizeLang(localStorage.getItem(STORAGE_KEY) || "en");
    } catch (e) {
      return "en";
    }
  }

  function setLang(lang) {
    var next = normalizeLang(lang);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {}
    applyAll(next);
    global.dispatchEvent(new CustomEvent("dba:localechange", { detail: { lang: next } }));
    return next;
  }

  function t(key, lang, vars) {
    var L = normalizeLang(lang || getLang());
    var bag = getStrings()[L] || {};
    var text = bag[key];
    if (text == null) {
      bag = getStrings().en || {};
      text = bag[key] || key;
    }
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        text = text.replace("{" + k + "}", String(vars[k]));
      });
    }
    return text;
  }

  function applyDataI18n(lang) {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key, lang);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (!key) return;
      el.innerHTML = t(key, lang);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key, lang));
    });
  }

  function lessonIdFromBody() {
    return document.body && document.body.getAttribute("data-lesson-id");
  }

  function captureReadingSnapshot() {
    var stack = document.querySelector("#reading .topic-stack");
    if (stack && !readingEnSnapshot) {
      readingEnSnapshot = stack.innerHTML;
    }
  }

  if (typeof global.addEventListener === "function") {
    global.addEventListener("dba:notesloaded", function () {
      readingEnSnapshot = null;
      readingCache = {};
      captureReadingSnapshot();
      applyLessonReading(getLang());
    });
  }

  function fetchReadingHtml(lessonId, lang) {
    var cacheKey = lessonId + ":" + lang;
    if (readingCache[cacheKey]) {
      return Promise.resolve(readingCache[cacheKey]);
    }
    var url =
      "assets/i18n/" + lang + "/" + lessonId + "-reading.html?v=1";
    return fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("missing translation");
        return res.text();
      })
      .then(function (html) {
        readingCache[cacheKey] = html;
        return html;
      });
  }

  function applyLessonReading(lang) {
    var lessonId = lessonIdFromBody();
    var stack = document.querySelector("#reading .topic-stack");
    if (!lessonId || !stack) return Promise.resolve();

    captureReadingSnapshot();

    if (lang === "en") {
      if (readingEnSnapshot) stack.innerHTML = readingEnSnapshot;
      return Promise.resolve();
    }

    return fetchReadingHtml(lessonId, lang)
      .then(function (html) {
        stack.innerHTML = html;
      })
      .catch(function () {
        if (readingEnSnapshot) stack.innerHTML = readingEnSnapshot;
      });
  }

  function updateLangSwitcher(lang) {
    document.querySelectorAll(".lang-switch [data-lang]").forEach(function (btn) {
      var active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function applyAll(lang) {
    var L = normalizeLang(lang);
    document.documentElement.lang = L === "so" ? "so" : "en";
    document.body.setAttribute("data-site-lang", L);
    applyDataI18n(L);
    document.querySelectorAll(".complete-btn[data-complete]").forEach(function (btn) {
      btn.textContent = t("btn.markComplete", L);
    });
    var logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) logoutBtn.textContent = t("btn.logout", L);
    updateLangSwitcher(L);
    return applyLessonReading(L);
  }

  function mountLangSwitch(container) {
    if (!container || container.querySelector(".lang-switch")) return;
    var wrap = document.createElement("div");
    wrap.className = "lang-switch";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", t("lang.switchLabel"));
    wrap.innerHTML =
      '<button type="button" data-lang="en">' +
      t("lang.english", "en") +
      '</button><button type="button" data-lang="so">' +
      t("lang.somali", "en") +
      "</button>";
    wrap.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-lang]");
      if (!btn) return;
      setLang(btn.getAttribute("data-lang"));
    });
    container.insertBefore(wrap, container.firstChild);
    updateLangSwitcher(getLang());
  }

  function autoMountSwitcher() {
    var slot = document.querySelector(".topbar-actions");
    if (slot) {
      slot.hidden = false;
      slot.removeAttribute("aria-hidden");
    }
    if (!slot) {
      slot =
        document.querySelector("[data-lang-switch]") ||
        document.querySelector(".topbar-inner");
    }
    if (slot) mountLangSwitch(slot);
  }

  function addNotesDownloadButton() {
    var actions = document.querySelector("#reading .reader-actions .button-row");
    if (!actions || actions.querySelector("[data-notes-download]")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "secondary-link";
    btn.setAttribute("data-notes-download", "1");
    btn.setAttribute("data-i18n", "btn.downloadNotes");
    btn.textContent = t("btn.downloadNotes");
    btn.addEventListener("click", function () {
      downloadLessonNotes();
    });
    actions.appendChild(btn);
  }

  function downloadLessonNotes() {
    var lessonId = lessonIdFromBody() || "lesson-notes";
    var lang = getLang();
    var titleEl = document.querySelector("#reading .section-title h2");
    var title = titleEl ? titleEl.textContent.trim() : lessonId;
    var stack = document.querySelector("#reading .topic-stack");
    var welcome = document.querySelector("#welcome .section-body");
    var parts = [
      "<!DOCTYPE html><html lang=\"" + lang + '\"><head><meta charset="utf-8"><title>',
      title,
      "</title></head><body>",
      "<h1>",
      title,
      "</h1>"
    ];
    if (welcome) {
      parts.push("<section><h2>", t("welcome.eyebrow", lang), "</h2>", welcome.innerHTML, "</section>");
    }
    if (stack) {
      parts.push("<section><h2>", t("reading.eyebrow", lang), "</h2>", stack.innerHTML, "</section>");
    }
    parts.push("</body></html>");
    var blob = new Blob([parts.join("")], { type: "text/html;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = lessonId + "-notes-" + lang + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 500);
  }

  function init() {
    captureReadingSnapshot();
    autoMountSwitcher();
    addNotesDownloadButton();
    applyAll(getLang());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.SiteLocale = {
    getLang: getLang,
    setLang: setLang,
    t: t,
    applyAll: applyAll,
    mountLangSwitch: mountLangSwitch,
    downloadLessonNotes: downloadLessonNotes
  };
})(typeof window !== "undefined" ? window : this);
