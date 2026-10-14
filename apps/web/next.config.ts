import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  deploymentId: process.env.DEPLOYMENT_VERSION,
  // Dev only: allow the loopback aliases developers actually use, otherwise
  // client chunks are blocked and pages render dead (no hydration, no clicks).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async rewrites() {
    // Auth override exists so local runs survive port squatters (e.g. an
    // unrelated project holding 3001): AUTH_INTERNAL_URL=http://localhost:3011
    const AUTH_BASE = process.env.AUTH_INTERNAL_URL || 'http://localhost:3001';
    const USER_BASE = process.env.USER_INTERNAL_URL || 'http://localhost:3002';
    const APPT_BASE = process.env.APPT_INTERNAL_URL || 'http://localhost:3005';
    return [
      {
        source: '/api/auth/:path*',
        destination: `${AUTH_BASE}/api/auth/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${USER_BASE}/api/users/:path*`,
      },
      {
        source: '/api/appointments/:path*',
        destination: `${APPT_BASE}/api/appointments/:path*`,
      },
      {
        source: '/api/prescriptions/:path*',
        destination: 'http://localhost:3004/api/prescriptions/:path*',
      },
      {
        source: '/api/telemedicine/:path*',
        destination: 'http://localhost:3013/api/telemedicine/:path*',
      },
      {
        source: '/api/analytics/:path*',
        destination: 'http://localhost:3006/api/analytics/:path*',
      },
      {
        source: '/api/wallets/:path*',
        destination: 'http://localhost:3008/api/wallets/:path*',
      },
      {
        source: '/api/smartguard/:path*',
        destination: 'http://localhost:3017/api/smartguard/:path*',
      },
      {
        source: '/api/rewards/:path*',
        destination: 'http://localhost:3011/api/rewards/:path*',
      },
      {
        source: '/api/notifications/:path*',
        destination: 'http://localhost:3016/api/notifications/:path*',
      },
      {
        source: '/api/payments/:path*',
        destination: 'http://localhost:3007/api/payments/:path*',
      },
      {
        source: '/api/pharmacy/:path*',
        destination: 'http://localhost:3014/api/pharmacy/:path*',
      },
      {
        source: '/api/messages/:path*',
        destination: 'http://localhost:3012/api/messages/:path*',
      },
      {
        source: '/api/addresses/:path*',
        destination: 'http://localhost:3015/api/addresses/:path*',
      },
      {
        source: '/api/subscriptions/:path*',
        destination: 'http://localhost:3009/api/subscriptions/:path*',
      },
      {
        source: '/api/admin/:path*',
        destination: 'http://localhost:3010/api/admin/:path*',
      },
    ];
  },
  transpilePackages: ['recharts', 'react-is', '@ricton/design-tokens'],
};

export default nextConfig;
