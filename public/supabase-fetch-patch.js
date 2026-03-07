(function() {
  var f = window.fetch;
  if (!f) return;
  function wrap(input, init) {
    var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    var p = f.apply(window, arguments);
    if (!url || url.indexOf('supabase') === -1) return p;
    return p.catch(function(err) {
      var m = err && err.message !== undefined ? err.message : String(err);
      if (m === 'Failed to fetch') {
        console.warn('Сеть недоступна (Supabase):', m);
        return new Response(JSON.stringify({ error: 'network_error', message: m }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      throw err;
    });
  }
  window.fetch = wrap;
  if (typeof globalThis !== 'undefined') globalThis.fetch = wrap;

  window.addEventListener('unhandledrejection', function(e) {
    var r = e.reason;
    if (r && (r.name === 'AuthRetryableFetchError' || (r.constructor && r.constructor.name === 'AuthRetryableFetchError'))) {
      e.preventDefault();
      console.warn('Сеть недоступна (Supabase Auth)');
    }
  }, true);
})();
