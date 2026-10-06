import { defineConfig } from '@playwright/test';

// `scripts/dev-up.sh` (the documented local launcher) serves Next on 3000.
// Keep the test default aligned so a real E2E run never silently targets a
// dead, undocumented port. CI/staging can still override E2E_BASE_URL.
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const useExternalServer = process.env.E2E_USE_EXTERNAL_SERVER === '1';

// Staging-slice E2E: exercises the wired patient journey in a real browser
// against the docker backend (direct service ports via Next rewrites) with an
// isolated Postgres (docker-compose.test.yml on :5433 is for jest; E2E uses
// the dev database and timestamped accounts so runs never collide).
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: useExternalServer
    ? undefined
    : {
        // Production server (validates the shippable build). For local iteration,
        // run `npx next dev -p 3100` yourself first; it will be reused.
        command: 'npx next start -p 3100',
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          ...process.env,
          NEXT_PUBLIC_API_URL: '',
        } as Record<string, string>,
      },
});
