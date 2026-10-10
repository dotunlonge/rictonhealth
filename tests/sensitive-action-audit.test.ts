/**
 * Money + privilege audit trail (TDD RED → GREEN).
 * Financial mutations and status elevations must leave an audit row —
 * refunds (SUCCESS→REFUNDED via Paystack) and user verification
 * (PENDING→ACTIVE, force-verified) are currently silent.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');

function fnBody(src: string, name: string): string {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) return '';
  const next = src.indexOf('export const ', start + 10);
  return src.slice(start, next < 0 ? undefined : next);
}

describe('sensitive-action audit trail', () => {
  it('refundPayment writes an audit row', () => {
    const src = fs.readFileSync(
      path.join(root, 'services', 'payment', 'src', 'controllers', 'payment.controller.ts'),
      'utf8'
    );
    expect(fnBody(src, 'refundPayment')).toMatch(/auditLog\.create/);
  });

  it('verifyUser writes an audit row', () => {
    const src = fs.readFileSync(
      path.join(root, 'services', 'admin', 'src', 'controllers', 'admin.controller.ts'),
      'utf8'
    );
    expect(fnBody(src, 'verifyUser')).toMatch(/auditLog\.create/);
  });
});
