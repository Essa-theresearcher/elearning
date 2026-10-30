(function (global) {
  function loadExpandedNotes() {
    var stack = document.querySelector("#reading .topic-stack[data-notes-en]");
    if (!stack) return Promise.resolve();

    var url = stack.getAttribute("data-notes-en");
    if (!url) return Promise.resolve();

    return fetch(url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=20261030d")
      .then(function (res) {
        if (!res.ok) throw new Error("Notes file missing");
        return res.text();
      })
      .then(function (html) {
        stack.innerHTML = html;
        stack.setAttribute("data-notes-loaded", "1");
        global.dispatchEvent(new CustomEvent("dba:notesloaded", { detail: { url: url } }));
      })
      .catch(function () {
        /* keep inline fallback HTML if fetch fails */
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadExpandedNotes);
  } else {
    loadExpandedNotes();
  }

  global.DBANotesLoader = { reload: loadExpandedNotes };
})(typeof window !== "undefined" ? window : this);
