/* A short message that appears at the bottom of the screen, then goes away. */
(function () {
  GN.ui = GN.ui || {};
  let el = null, timer = 0;
  GN.ui.toast = function (text, ms = 5000) {
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("is-on");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("is-on"), ms);
  };
})();
