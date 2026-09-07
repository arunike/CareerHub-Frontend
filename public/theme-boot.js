// Paints the saved theme before the bundle loads, so a dark-mode visitor sees no white flash.
// A separate file rather than an inline script: the production CSP is script-src 'self', which
// blocks inline execution outright.
(function () {
  try {
    var supported = function (value) {
      return value === 'light' || value === 'dark' || value === 'system';
    };
    var stored = window.localStorage.getItem('careerhub-theme');
    if (!supported(stored)) stored = window.localStorage.getItem('careerhub-public-theme');
    var preference = supported(stored) ? stored : 'system';
    var dark =
      preference === 'dark' ||
      (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (!dark) return;
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
    document.documentElement.style.backgroundColor = '#08090b';
  } catch (error) {
    /* A blocked storage read just means the default light paint. */
  }
})();
