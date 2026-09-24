// Keep URL handling separate from the original article demos and comment identity.
export function immersiveLocaleRuntime(slug) {
  return `(function () {
  var routes = ${JSON.stringify({ zh: `/immersive/${slug}/`, en: `/en/immersive/${slug}/` })};
  var current = new URL(location.href);
  var requested = current.searchParams.get('lang');
  if (requested === 'en' || requested === 'zh') {
    current.pathname = routes[requested];
    current.searchParams.delete('lang');
    location.replace(current.pathname + current.search + current.hash);
  }
  function target(locale) {
    var url = new URL(location.href);
    url.pathname = routes[locale];
    url.searchParams.delete('lang');
    return url.pathname + url.search + url.hash;
  }
  function syncLinks() {
    document.querySelectorAll('a[data-immersive-locale]').forEach(function (link) {
      link.setAttribute('href', target(link.dataset.immersiveLocale));
    });
  }
  document.addEventListener('DOMContentLoaded', syncLinks);
  window.addEventListener('hashchange', syncLinks);
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-immersive-locale]');
    if (!link) return;
    link.setAttribute('href', target(link.dataset.immersiveLocale));
    event.stopImmediatePropagation();
  }, true);
})();`;
}
