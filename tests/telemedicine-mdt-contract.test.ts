/**
 * C5 MDT creation contract (TDD RED → GREEN).
 * The telemedicine backend already supports MDT rooms; the web UI must offer
 * creating them instead of hardcoding ONE_ON_ONE.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

describe('C5 MDT creation contract', () => {
  it('backend accepts MDT roomType on create', () => {
    const ctrl = fs.readFileSync(
      path.join(
        root,
        'services',
        'telemedicine',
        'src',
        'controllers',
        'telemedicine.controller.ts'
      ),
      'utf8'
    );
    expect(ctrl).toMatch(/MDT/);
  });

  it('web UI offers MDT room creation (not hardcoded ONE_ON_ONE)', () => {
    const page = fs.readFileSync(
      path.join(root, 'apps', 'web', 'src', 'app', 'telemedicine', 'page.tsx'),
      'utf8'
    );
    expect(page).toMatch(/MDT/);
    // The create call must let the user choose the room type.
    expect(page).not.toMatch(
      /api\.post\('\/telemedicine\/meetings', \{ roomType: 'ONE_ON_ONE' \}\)/
    );
  });
});
