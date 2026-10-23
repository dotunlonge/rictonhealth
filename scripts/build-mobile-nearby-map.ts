/**
 * Bundles Leaflet (JS + CSS) plus the nearby-map bootstrap into a JSON module
 * the React Native WebView can import offline.
 *
 * Why not a CDN: the mobile map must work in the Expo dev build and on flaky
 * hospital networks without depending on an external script host. Leaflet is
 * vendored here, OpenStreetMap raster tiles are the only runtime network call,
 * and no API/tracking key is required.
 *
 * Output: apps/mobile/src/features/nearby/leaflet-bundle.json
 * Run:    npx ts-node -O '{"module":"commonjs"}' scripts/build-mobile-nearby-map.ts
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'apps/mobile/src/features/nearby');

const INIT_SCRIPT = `(function () {
  var map = L.map('map', { zoomControl: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var layer = L.layerGroup().addTo(map);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function makeIcon() {
    return L.divIcon({
      className: '',
      html: '<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#1877F2;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>',
      iconSize: [22, 22],
      iconAnchor: [11, 22],
      popupAnchor: [0, -20]
    });
  }

  function setProviders(payload) {
    layer.clearLayers();
    var providers = (payload && payload.providers) || [];
    var bounds = [];
    providers.forEach(function (provider) {
      if (typeof provider.latitude !== 'number' || typeof provider.longitude !== 'number') return;
      var marker = L.marker([provider.latitude, provider.longitude], { icon: makeIcon() }).addTo(layer);
      var distance = provider.distanceKm != null ? '<br/>' + provider.distanceKm + ' km away' : '';
      marker.bindPopup(
        '<strong>' + escapeHtml(provider.name) + '</strong><br/>' +
        escapeHtml(provider.specialty || '') + distance +
        '<br/><button type="button" class="ricton-popup-btn" data-id="' + escapeHtml(provider.id) + '">View profile</button>'
      );
      bounds.push([provider.latitude, provider.longitude]);
    });
    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    } else if (payload && payload.center) {
      map.setView(payload.center, 11);
    }
  }

  map.on('popupopen', function (event) {
    var element = event.popup && event.popup.getElement();
    if (!element) return;
    var button = element.querySelector('.ricton-popup-btn');
    if (!button) return;
    button.addEventListener('click', function () {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: button.getAttribute('data-id') }));
      }
    });
  });

  window.RictonMap = {
    setProviders: setProviders,
    setView: function (center, zoom) { map.setView(center, zoom || 11); }
  };

  setTimeout(function () {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  }, 0);
})();`;

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const js = fs.readFileSync(path.join(root, 'node_modules/leaflet/dist/leaflet.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'node_modules/leaflet/dist/leaflet.css'), 'utf8');
  const target = path.join(outDir, 'leaflet-bundle.json');
  const json = JSON.stringify({ js, css, init: INIT_SCRIPT });
  fs.writeFileSync(target, json);
  // eslint-disable-next-line no-console
  console.log(`Wrote ${path.relative(root, target)} (${(json.length / 1024).toFixed(1)} KB)`);
}

main();
