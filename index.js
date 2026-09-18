// Worker de Cloudflare — puente CORS de solo lectura hacia la API pública de Kalshi.
// No necesita API key (los endpoints de lectura de Kalshi son públicos).
// Despliega esto igual que hiciste con ova-ia, y luego pon la URL que te da
// Cloudflare en la constante KALSHI_PROXY de futbol.html.
//
// Ejemplo de uso una vez desplegado:
//   https://TU-WORKER.workers.dev/events?series_ticker=KXEPLGAME&status=open&with_nested_markets=true
//
// Esta version le mete cache de 45s (para no golpear a Kalshi con cada toque del
// boton) y headers mas completos, en caso de que el 429 haya sido por verse como
// trafico de bot. OJO: si el 429 es un bloqueo de fondo al rango de IPs de los
// Workers de Cloudflare, esto no lo va a arreglar -- eso no tiene solucion desde
// aqui sin cambiar de donde corre el proxy.

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    const upstreamUrl = 'https://external-api.kalshi.com/trade-api/v2' + url.pathname + url.search;

    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl, request);
    let cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, { status: cached.status, headers: corsHeaders() });
    }

    try {
      const resp = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          'Referer': 'https://kalshi.com/',
          'Origin': 'https://kalshi.com'
        }
      });
      const body = await resp.text();
      const respuesta = new Response(body, { status: resp.status, headers: corsHeaders() });
      if (resp.status === 200) {
        const paraCache = new Response(body, { status: resp.status, headers: corsHeaders() });
        paraCache.headers.set('Cache-Control', 'max-age=45');
        ctx.waitUntil(cache.put(cacheKey, paraCache));
      }
      return respuesta;
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy_error', message: String(err) }), {
        status: 502,
        headers: corsHeaders()
      });
    }
  }
};
