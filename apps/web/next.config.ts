import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3001/api/auth/:path*',
      },
      {
        source: '/api/users/:path*',
        destination: 'http://localhost:3002/api/users/:path*',
      },
      {
        source: '/api/appointments/:path*',
        destination: 'http://localhost:3005/api/appointments/:path*',
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
        source: '/api/wallet/:path*',
        destination: 'http://localhost:3008/api/wallet/:path*',
      },
      {
        source: '/api/rewards/:path*',
        destination: 'http://localhost:3011/api/rewards/:path*',
      },
      {
        source: '/api/notifications/:path*',
        destination: 'http://localhost:3009/api/notifications/:path*',
      },
    ];
  },
  transpilePackages: ['recharts', 'react-is'],
};

export default nextConfig;
