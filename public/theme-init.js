// Light is the default. Dark only when the visitor chose it with the toggle.
try {
  if (localStorage.getItem("dfm-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch (e) {
  /* storage blocked: stay light */
}
