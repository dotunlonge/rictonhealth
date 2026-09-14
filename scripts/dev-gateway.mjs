/**
 * Dev-only Kong replacement (local simulator runs — NEVER production).
 * Mirrors gateway/kong.yml prefix routing with strip_path:false semantics:
 * forwards the full path to the matching local service.
 */
import http from 'node:http';

const ROUTES = [
  ['/api/auth', 3001],
  ['/api/users', 3002],
  ['/api/payments', 3007],
  ['/api/wallets', 3008],
  ['/api/appointments', 3005],
  ['/api/prescriptions', 3004],
  ['/api/telemedicine', 3013],
  ['/api/pharmacy', 3014],
  ['/api/notifications', 3016],
  ['/api/messages', 3012],
  ['/api/subscriptions', 3009],
  ['/api/rewards', 3011],
  ['/api/addresses', 3015],
  ['/api/analytics', 3006],
  ['/api/admin', 3010],
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://gateway');
  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, gateway: 'dev-shim' }));
    return;
  }
  const match = ROUTES.filter(([prefix]) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)).sort(
    (a, b) => b[0].length - a[0].length
  )[0];
  if (!match) {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { code: 'NO_ROUTE', message: `No dev route for ${url.pathname}` } }));
    return;
  }
  const proxy = http.request(
    { host: '127.0.0.1', port: match[1], path: req.url, method: req.method, headers: req.headers },
    (upstream) => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    }
  );
  proxy.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: { code: 'BAD_GATEWAY', message: `Service :${match[1]} unreachable` } }));
  });
  req.pipe(proxy);
});

server.listen(8000, () => console.log('dev gateway on :8000'));
