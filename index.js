// Worker de Cloudflare — puente CORS de solo lectura hacia la API pública de Kalshi.
// No necesita API key (los endpoints de lectura de Kalshi son públicos).
// Despliega esto igual que hiciste con ova-ia, y luego pon la URL que te da
// Cloudflare en la constante KALSHI_PROXY de futbol.html.
//
// Ejemplo de uso una vez desplegado:
//   https://TU-WORKER.workers.dev/events?series_ticker=KXEPLGAME&status=open&with_nested_markets=true

function corsHeaders(){
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);
    // todo lo que venga despues del dominio del worker se reenvia tal cual
    // a la API de Kalshi (ej: /events?series_ticker=KXEPLGAME -> .../trade-api/v2/events?series_ticker=KXEPLGAME)
    const upstreamUrl = 'https://external-api.kalshi.com/trade-api/v2' + url.pathname + url.search;

    try {
      const resp = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        }
      });
      const body = await resp.text();
      return new Response(body, {
        status: resp.status,
        headers: corsHeaders()
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'proxy_error', message: String(err) }), {
        status: 502,
        headers: corsHeaders()
      });
    }
  }
};
