/**
 * G4 Telemedicine safety guards (TDD RED → GREEN).
 * Source-static: no Docker/DB. Run: npx jest tests/telemedicine-safety.test.ts
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');
const ctrl = () => read('services/telemedicine/src/controllers/telemedicine.controller.ts');
const routes = () => read('services/telemedicine/src/routes/telemedicine.routes.ts');

describe('G4: no phantom rooms, no simulated tokens', () => {
  it('getRoomToken never auto-creates unknown rooms', () => {
    expect(ctrl()).not.toMatch(/Auto-create room/);
    expect(ctrl()).not.toMatch(
      /telemedicineRoom\.create\(\{\s*data:\s*\{\s*providerId: userPayload\.userId/s
    );
  });

  it('fails closed without LiveKit config (no simulated_token fallback)', () => {
    expect(ctrl()).not.toMatch(/simulated_token_/);
    expect(read('apps/web/src/app/telemedicine/[id]/page.tsx')).not.toMatch(/simulated_token/);
    expect(ctrl()).toMatch(/isLiveKitConfigured/);
    expect(ctrl()).toMatch(/SERVICE_NOT_CONFIGURED|not configured/i);
  });

  it('uses explicit room identity (no Math.random IDs, no fabricated provider URLs)', () => {
    expect(ctrl()).not.toMatch(/Math\.random\(\)/);
    expect(ctrl()).not.toMatch(/video\.twilio\.com/);
    expect(ctrl()).not.toMatch(/from 'twilio'/);
    expect(ctrl()).toMatch(/from 'livekit-server-sdk'/);
  });
});

describe('G4: membership authorization', () => {
  it('token issuance verifies caller belongs to the room/appointment first', () => {
    const src = ctrl();
    // Membership check must precede token minting in getRoomToken.
    const tokenFn = src.slice(src.indexOf('export const getRoomToken'));
    const checkPos = tokenFn.search(/not a participant|not authorized|ForbiddenError/);
    const mintPos = tokenFn.search(/toJwt\(\)|AccessToken/);
    expect(checkPos).toBeGreaterThanOrEqual(0);
    expect(mintPos).toBeGreaterThanOrEqual(0);
    expect(checkPos).toBeLessThan(mintPos);
  });

  it('endRoom is host/provider/admin-only, never any authenticated caller', () => {
    const src = ctrl();
    const endFn = src.slice(src.indexOf('export const endRoom'));
    expect(endFn).toMatch(/HOST|providerId|SUPER_ADMIN/);
  });

  it('ends a provisioned provider room before committing the local ENDED state', () => {
    const src = ctrl();
    const endFn = src.slice(
      src.indexOf('export const endRoom'),
      src.indexOf('export const joinRoom')
    );
    const providerEnd = endFn.search(/completeLiveKitRoom/);
    const localEnd = endFn.search(/telemedicineRoom\.update/);
    expect(providerEnd).toBeGreaterThanOrEqual(0);
    expect(localEnd).toBeGreaterThan(providerEnd);
  });

  it('getParticipants is member-scoped and returns minimal PII', () => {
    const src = ctrl();
    const partFn = src.slice(src.indexOf('export const getParticipants'));
    expect(partFn).toMatch(/assertRoomMembership/);
    expect(partFn).not.toMatch(/phone:\s*true/);
  });
});

describe('G4: provider status callbacks', () => {
  it('exposes a signature-verified callback that only moves rooms toward ENDED', () => {
    expect(routes()).toMatch(/callbacks\/status/);
    const src = ctrl();
    const cbFn = src.slice(src.indexOf('export const handleStatusCallback'));
    expect(cbFn).toMatch(/authorization/i);
    expect(cbFn).toMatch(/timingSafeEqual/);
    expect(cbFn).toMatch(/TelemedicineRoomStatus\.ENDED/);
    expect(cbFn).not.toMatch(/recording|Recording/);
    expect(cbFn).toMatch(/room_started/);
    expect(cbFn).toMatch(/room_finished/);
  });

  it('mints LiveKit join tokens bound to the provisioned room name', () => {
    const src = ctrl();
    expect(src).toMatch(/new RoomServiceClient\(url, apiKey, apiSecret\)/);
    const tokenFn = src.slice(src.indexOf('export const getRoomToken'));
    expect(tokenFn).toMatch(/roomJoin:\s*true/);
    expect(tokenFn).toMatch(/serverUrl/);
  });

  it('does not mark a room active merely because a token was minted', () => {
    const src = ctrl();
    const tokenFn = src.slice(
      src.indexOf('export const getRoomToken'),
      src.indexOf('export const endRoom')
    );
    expect(tokenFn).not.toMatch(/status:\s*TelemedicineRoomStatus\.ACTIVE/);
    const cbFn = src.slice(src.indexOf('export const handleStatusCallback'));
    expect(cbFn).toMatch(/room_started/);
    expect(cbFn).toMatch(/TelemedicineRoomStatus\.ACTIVE/);
  });
});

describe('G4: leave ≠ end', () => {
  it('exposes a leave route that only marks the caller departed', () => {
    expect(routes()).toMatch(/leave/);
    expect(ctrl()).toMatch(/export const leaveRoom/);
    const start = ctrl().indexOf('export const leaveRoom');
    const nextExport = ctrl().indexOf('export const', start + 1);
    const leaveFn = ctrl().slice(start, nextExport === -1 ? undefined : nextExport);
    expect(leaveFn).toMatch(/leftAt/);
    expect(leaveFn).not.toMatch(/status:\s*TelemedicineRoomStatus\.ENDED/);
  });

  it('lobby validates room codes without joining (no presence pollution)', () => {
    // POST …/join flips CREATED→ACTIVE + joinedAt server-side. The lobby
    // pre-check must use the side-effect-free token endpoint instead, so
    // abandoned lobby checks never masquerade as attended sessions.
    const src = read('apps/web/src/app/telemedicine/page.tsx');
    expect(src).not.toMatch(/telemedicine\/rooms\/.*\/join/);
    expect(src).toMatch(/\/token/);
  });

  it('rate-limits join/token issuance (admit-by-code brute force)', () => {
    // The room code is a bearer credential; unauthenticated guessing must be
    // throttled before the membership check, not after.
    const src = routes();
    expect(src).toMatch(/rateLimit/);
    expect(src).toMatch(/rooms\/:id\/token/);
    expect(src).toMatch(/rooms\/:id\/join/);
  });

  it('surfaces reconnect, network quality, and waiting-room states', () => {
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).toMatch(/networkQuality/);
    expect(src).toMatch(/reconnecting/);
    expect(src).toMatch(/Waiting room/);
    expect(src).toMatch(/Retry joining/);
  });

  it('web video room leaves via /leave and ends via /end (no conflation)', () => {
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).toMatch(/\/leave/);
    expect(src).toMatch(/\/end/);
    expect(src).not.toMatch(/end-to-end encrypted|End-to-end encrypted/i);
    expect(src).toMatch(/not recorded by Ricton/i);
  });

  it('web video room surfaces remote end and offers a fresh-token rejoin', () => {
    // Host end-for-all closes the RTC session: the page must show "visit
    // ended" (not a dead room) and re-mint a token on rejoin, since the old
    // token may be expired.
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).toMatch(/RoomEvent\.Disconnected/);
    expect(src).toMatch(/Visit ended|visit has ended/i);
    expect(src).toMatch(/Rejoin/i);
  });

  it('web video room degrades to audio-only when the camera fails', () => {
    // A blocked camera must not abort the whole visit: mic stays live with
    // an honest audio-only notice.
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).toMatch(/audio-only|Audio-only/i);
    const connectFn = src.slice(src.indexOf('async function connect'));
    expect(connectFn).toMatch(/setCameraEnabled/);
    // Camera enablement is attempted but never throws the whole connect.
    expect(connectFn).not.toMatch(/await livekitRoom\.localParticipant\.setCameraEnabled\(true\);/);
  });

  it('web video room prompts a fresh-token rejoin before the 1h token TTL', () => {
    // Backend tokens live 1h; the page warns before expiry and rejoins via a
    // reload (the mount effect re-mints), so long consults never strand users.
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).toMatch(/50\s*\*\s*60|TOKEN_REFRESH|expiring soon|refresh/i);
    expect(src).toMatch(/Rejoin/i);
  });

  it('web call controls reflect the device, never optimistic flips', () => {
    // Fire-and-forget mute() + unconditional setState lies when the device
    // call fails. Toggles must await the device and only flip on success.
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    const muteFn = src.slice(src.indexOf('const toggleMute'), src.indexOf('const toggleVideo'));
    expect(muteFn).toMatch(/await/);
    expect(muteFn).toMatch(/setActionError|setError/);
    const videoFn = src.slice(
      src.indexOf('const toggleVideo'),
      src.indexOf('const stopScreenShare')
    );
    expect(videoFn).toMatch(/await/);
    expect(videoFn).toMatch(/setActionError|setError/);
  });

  it('web leave surfaces server failure instead of navigating away', () => {
    // Redirecting after a failed /leave strands the user server-side-joined
    // with no retry. Failure must stay on the page with an error.
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    const leaveFn = src.slice(
      src.indexOf('const handleLeave'),
      src.indexOf('const handleEndForAll')
    );
    expect(leaveFn).toMatch(/\/leave/);
    expect(leaveFn).toMatch(/success/);
    expect(leaveFn).toMatch(/setActionError|setError/);
  });
});

describe('G4: browser call controls are real', () => {
  it('maps the room-list response and create payload to the backend contract', () => {
    const src = read('apps/web/src/app/telemedicine/page.tsx');
    expect(src).toMatch(/providerProfile\?\.firstName/);
    expect(src).toMatch(/patientProfile\?\.firstName/);
    expect(src).toMatch(/appointment\?\.scheduledAt/);
    expect(src).toMatch(/roomType:\s*'ONE_ON_ONE'/);
    expect(src).not.toMatch(/roomType:\s*'HD Video Call'/);
  });

  it('implements screen sharing and in-room data chat without coming-soon controls', () => {
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    expect(src).not.toMatch(/coming soon/i);
    expect(src).not.toMatch(/twilio-video/);
    expect(src).toMatch(/from 'livekit-client'/);
    expect(src).toMatch(/setScreenShareEnabled/);
    expect(src).toMatch(/publishData/);
    expect(src).toMatch(/DataReceived/);
  });

  it('does not disconnect a non-host before the server accepts end-for-all', () => {
    const src = read('apps/web/src/app/telemedicine/[id]/page.tsx');
    const handler = src.slice(
      src.indexOf('const handleEndForAll'),
      src.indexOf('const formatDuration')
    );
    expect(handler.indexOf('/end')).toBeGreaterThanOrEqual(0);
    expect(handler.indexOf('room.disconnect()')).toBeGreaterThan(handler.indexOf('/end'));
  });
});
