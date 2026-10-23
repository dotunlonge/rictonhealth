/**
 * Nearby-doctor map contract: the WebView document must vendor Leaflet and
 * render OpenStreetMap tiles with no API/tracking key, and the RN↔WebView
 * bridge message must parse defensively.
 */
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { buildNearbyMapHtml, parseNearbyMapMessage } from '@/features/nearby/nearby-map-html';

describe('nearby map bundle', () => {
  it('vendors Leaflet and uses OpenStreetMap tiles without a key', () => {
    const html = buildNearbyMapHtml();
    expect(html).toContain('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(html).toContain('L.map');
    expect(html).toContain('ReactNativeWebView');
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).not.toContain('googleapis');
    expect(html).not.toContain('mapbox');
    expect(html).not.toContain('apiKey');
    expect(html).not.toContain('access_token');
  });

  it('builds a valid HTML document with the map mount and bootstrap', () => {
    const html = buildNearbyMapHtml();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<div id="map"></div>');
    expect(html).toContain('window.RictonMap');
  });

  it('parses pin selection and ready messages', () => {
    expect(parseNearbyMapMessage(JSON.stringify({ type: 'select', id: 'prov-1' }))).toEqual({
      type: 'select',
      id: 'prov-1',
    });
    expect(parseNearbyMapMessage(JSON.stringify({ type: 'ready' }))).toEqual({ type: 'ready' });
  });

  it('rejects malformed or unknown bridge messages', () => {
    expect(parseNearbyMapMessage('not-json')).toBeNull();
    expect(parseNearbyMapMessage(JSON.stringify({ type: 'unknown' }))).toBeNull();
    expect(parseNearbyMapMessage('')).toBeNull();
  });
});
