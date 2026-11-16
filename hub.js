// hub.js: loaded by every page. Starts the offline worker, adds the "back to all tests" link
// on test pages (a home-screen app has no browser back button) and stores the last score.
(function () {
  var me = document.currentScript;
  var root = new URL(".", me ? me.src : location.href);           // folder that holds hub.js = site root
  var isHome = document.documentElement.hasAttribute("data-hub-home");
  var rel = location.pathname.indexOf(root.pathname) === 0 ? location.pathname.slice(root.pathname.length) : location.pathname;

  window.Hub = {
    root: root.href,
    path: rel,
    // Save the latest result of this test, the overview shows it.
    report: function (points, max) {
      try { localStorage.setItem("hub:last:" + rel, JSON.stringify({ p: points, m: max, t: Date.now() })); } catch (e) {}
    }
  };

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(root.href + "sw.js", { scope: root.pathname }).catch(function () {});
  }

  if (!isHome) {
    var add = function () {
      var a = document.createElement("a");
      a.href = root.href;
      a.textContent = "‹ Alle Tests";
      a.className = "hub-back";
      a.setAttribute("style", "display:inline-block;align-self:flex-start;margin:0 0 10px;padding:6px 12px;border-radius:99px;font:600 14px system-ui,sans-serif;" +
        "text-decoration:none;color:inherit;border:1.5px solid rgba(127,140,150,.45);background:transparent");
      var host = document.querySelector(".wrap") || document.body;
      host.insertBefore(a, host.firstChild);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
  }
})();
