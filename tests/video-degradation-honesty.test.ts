/**
 * Video degradation honesty (TDD RED → GREEN).
 * Decision: @livekit/react-native stays OUT (re-adding it risks the known
 * WebRTC/WebRTC.h vs LiveKitWebRTC native-module build break, unverifiable
 * without device builds here). The native renderer is therefore absent, so
 * the room screen MUST gate on hasNativeVideoView() and state audio-only
 * truthfully instead of implying a video preview.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('video degradation honesty', () => {
  const src = () =>
    fs.readFileSync(
      path.join(root, 'apps', 'mobile', 'app', '(app)', 'telemedicine', '[roomId].tsx'),
      'utf8'
    );

  it('gates the renderer on native availability', () => {
    expect(src()).toMatch(/hasNativeVideoView\(\)/);
  });

  it('states audio-only with a dedicated notice when the renderer is absent', () => {
    expect(src()).toMatch(/testID="tele\.audio-only"/);
    expect(src()).toMatch(/native video build/i);
  });
});
