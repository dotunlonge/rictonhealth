/**
 * Ops-integrity guards: smartguard honesty, push persistence, real analytics (TDD).
 * Source-static + schema-static: no Docker/DB.
 */
import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(root, p), 'utf8');

describe('Smartguard: real audit-backed ops, correct routes', () => {
  const ctrl = () => read('services/smartguard/src/controllers/smartguard.controller.ts');
  const routes = () => read('services/smartguard/src/routes/smartguard.routes.ts');

  it('acknowledge route carries :id (controller reads req.params.id)', () => {
    expect(routes()).toMatch(/\/alerts\/:id\/acknowledge/);
  });

  it('derives alerts/threats/metrics from the audit log (no hardcoded fixtures)', () => {
    const src = ctrl();
    expect(src).toMatch(/prisma\.auditLog\.(findMany|count)/);
    expect(src).not.toMatch(/alert-001|threat-001/);
    expect(src).not.toMatch(/totalRequests:\s*15420/);
  });

  it('is admin-scoped (requireRole SUPER_ADMIN)', () => {
    expect(routes()).toMatch(/requireRole\('SUPER_ADMIN'\)/);
  });
});

describe('Docker builds: deterministic installs', () => {
  it('all service Dockerfiles inherit the npm-ci-built base image', () => {
    expect(read('Dockerfile.base')).toMatch(/RUN npm ci\b/);
    const servicesDir = path.join(root, 'services');
    const files = fs
      .readdirSync(servicesDir)
      .map((svc) => path.join('services', svc, 'Dockerfile'))
      .filter((f) => fs.existsSync(path.join(root, f)))
      .concat(['packages/db/Dockerfile']);
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const src = read(f);
      if (f === 'packages/db/Dockerfile') {
        expect(`${f} ${src.match(/RUN npm (ci|install)/)?.[0] || 'none'}`).toMatch(/npm ci/);
      } else {
        expect(src).toMatch(/FROM ricton-base AS builder/);
        expect(src).not.toMatch(/RUN npm install\b/);
      }
    }
  });

  it('every --workspace reference resolves to a real workspace package name', () => {
    // Regression: 7 service Dockerfiles referenced @ricton/<svc>-service while
    // the packages were named @ricton/<svc> ("No workspaces found"), breaking
    // every image build locally and in CI. This guard pins Dockerfile args,
    // root scripts, and CI workspace flags to package.json names.
    const pkgNames = new Set<string>();
    for (const dir of fs.readdirSync(path.join(root, 'services'))) {
      const p = path.join(root, 'services', dir, 'package.json');
      if (fs.existsSync(p)) pkgNames.add(JSON.parse(fs.readFileSync(p, 'utf8')).name);
    }
    for (const dir of fs.readdirSync(path.join(root, 'packages'))) {
      const p = path.join(root, 'packages', dir, 'package.json');
      if (fs.existsSync(p)) {
        try {
          pkgNames.add(JSON.parse(fs.readFileSync(p, 'utf8')).name);
        } catch {
          /* ignore non-package dirs */
        }
      }
    }
    const checkFile = (rel: string, pattern: RegExp) => {
      const src = read(rel);
      const missing = [...src.matchAll(pattern)]
        .map((m) => m[1])
        .filter((name) => !pkgNames.has(name));
      expect(`${rel} references unknown workspaces: ${missing.join(', ')}`).toBe(
        `${rel} references unknown workspaces: `
      );
    };
    for (const dir of fs.readdirSync(path.join(root, 'services'))) {
      const dockerfile = path.join('services', dir, 'Dockerfile');
      if (fs.existsSync(path.join(root, dockerfile))) {
        checkFile(dockerfile, /--workspace=(@[a-z/@.-]+)/g);
      }
    }
    checkFile('package.json', /-w (@[a-z/@.-]+)/g);
    checkFile('package.json', /--workspace=(@[a-z/@.-]+)/g);
    checkFile('.github/workflows/ci.yml', /--workspace=(@[a-z/@.-]+)/g);
  });

  it('every runnable image ships OpenSSL so Prisma picks the musl-openssl-3 engine', () => {
    // Regression: runner stages had curl but no openssl, so Prisma defaulted
    // to the openssl-1.1.x engine (libssl.so.1.1 missing) and every query
    // crashed — all /health checks 503d. Runners must install openssl.
    const files = fs
      .readdirSync(path.join(root, 'services'))
      .map((svc) => path.join('services', svc, 'Dockerfile'))
      .filter((f) => fs.existsSync(path.join(root, f)))
      .concat(['packages/db/Dockerfile']);
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) {
      const stages = read(f)
        .split(/^FROM /m)
        .map((stage) => stage.trim())
        .filter((stage) => stage.length > 0);
      const runners = stages.filter((stage) => !/AS builder/i.test(stage.split('\n')[0]));
      expect(runners.length).toBeGreaterThan(0);
      for (const runner of runners) {
        expect(runner).toMatch(/apk add/);
        expect(runner).toMatch(/openssl/);
      }
    }
  });

  it('the ECR push script builds the shared base image before any service', () => {
    // Regression: every service Dockerfile is FROM ricton-base, but nothing
    // built that image — the only local copy had no /app/services at all, so
    // all 17 image builds failed and CI could never publish. The base build
    // must precede the per-service loop.
    const script = read('scripts/aws-ecr-push.sh');
    const baseIdx = script.search(/docker build[^\n]*Dockerfile\.base[^\n]*-t ricton-base/);
    const loopIdx = script.search(/for SERVICE in/);
    expect(baseIdx).toBeGreaterThanOrEqual(0);
    expect(loopIdx).toBeGreaterThan(baseIdx);
  });

  it('no service nests a typescript outside its declared range (invalid .bin/tsc)', () => {
    // Regression: services/docs/node_modules/typescript was 6.0.3 while docs
    // declares ^5.4.5, so `npm run build -w @ricton/docs-service` compiled
    // with the wrong major locally and in Docker. Only apps/mobile may nest TS 6.
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { version: string }>;
    };
    const semverMajor = (v: string) => v.split('.')[0];
    const bad: string[] = [];
    for (const [key, entry] of Object.entries(lock.packages || {})) {
      const m = key.match(/^(services\/[^/]+)\/node_modules\/typescript$/);
      if (!m) continue;
      const declared = JSON.parse(
        fs.readFileSync(path.join(root, m[1], 'package.json'), 'utf8')
      ) as {
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      };
      const range = declared.devDependencies?.typescript || declared.dependencies?.typescript || '';
      if (range && semverMajor(entry.version) !== semverMajor(range.replace(/^[\^~>=<\s]+/, ''))) {
        bad.push(`${key}@${entry.version} (declares ${range})`);
      }
    }
    expect(`mismatched nested typescript: ${bad.join(', ')}`).toBe(
      'mismatched nested typescript: '
    );
  });
});

describe('Dev-stack ports: overridable host bindings', () => {
  it('redis host port is configurable (local-redis collisions)', () => {
    const compose = read('docker-compose.yml');
    expect(compose).toMatch(/REDIS_HOST_PORT/);
    // Container port stays canonical so in-network URLs keep working.
    expect(compose).toMatch(/\$\{REDIS_HOST_PORT:-6379\}:6379/);
    expect(read('.env.example')).toMatch(/REDIS_HOST_PORT/);
  });
});

describe('Gateway abuse containment', () => {
  it('rate-limits the auth surface at the edge', () => {
    const kong = read('gateway/kong.yml');
    expect(kong).toMatch(/auth-service[\s\S]{0,600}rate-limiting/);
    expect(kong).toMatch(/fault_tolerant:\s*false/);
  });

  it('verifies JWT at the edge for booking and video surfaces', () => {
    // Service-level requireAuth stays authoritative; edge JWT sheds
    // unauthenticated floods before they reach the appointment/telemedicine
    // services (same iss/exp config as user-service).
    const kong = read('gateway/kong.yml');
    expect(kong).toMatch(/appointment-service[\s\S]{0,600}name: jwt/);
    expect(kong).toMatch(/telemedicine-service[\s\S]{0,600}name: jwt/);
  });
});

describe('Service ports: defaults match the canonical map', () => {
  const EXPECTED: Record<string, string> = {
    'services/auth/src/index.ts': 'PORT_AUTH || 3001',
    'services/user/src/index.ts': 'PORT_USER || 3002',
    'services/appointment/src/index.ts': 'PORT_APPOINTMENT || 3005',
    'services/prescription/src/index.ts': 'PORT_PRESCRIPTION || 3004',
    'services/telemedicine/src/index.ts': 'PORT_TELEMEDICINE || 3013',
    'services/pharmacy/src/index.ts': 'PHARMACY_PORT || 3014',
    'services/payment/src/index.ts': 'PORT_PAYMENT || 3007',
    'services/wallet/src/index.ts': 'PORT_WALLET || 3008',
    'services/notification/src/index.ts': 'NOTIFICATION_PORT || 3016',
    'services/admin/src/index.ts': 'PORT_ADMIN || 3010',
    'services/analytics/src/index.ts': 'PORT_ANALYTICS || 3006',
    'services/rewards/src/index.ts': 'PORT_REWARDS || 3011',
    'services/messaging/src/index.ts': 'MESSAGING_PORT || 3012',
    'services/subscription/src/index.ts': 'PORT_SUBSCRIPTION || 3009',
    'services/address/src/index.ts': 'PORT_ADDRESS || 3015',
    'services/smartguard/src/index.ts': 'PORT_SMARTGUARD || 3017',
  };
  it.each(Object.entries(EXPECTED))('%s defaults correctly', (file, fragment) => {
    expect(read(file)).toContain(fragment);
  });
});

describe('Push tokens: actually stored', () => {
  it('schema has a PushToken model with idempotency unique', () => {
    expect(read('packages/db/prisma/schema.prisma')).toMatch(
      /model PushToken[\s\S]{0,500}@@unique\(\[userId,\s*token\]\)/
    );
  });

  it('registration upserts instead of console.log', () => {
    const src = read('services/notification/src/controllers/notification.controller.ts');
    expect(src).toMatch(/prisma\.pushToken\.upsert/);
    expect(src).not.toMatch(/console\.log\(`Registering push token/);
  });
});

describe('Admin analytics: real aggregates', () => {
  it('computes provider counts via groupBy and bounded growth series', () => {
    const src = read('services/admin/src/controllers/admin.controller.ts');
    expect(src).toMatch(/groupBy/);
    expect(src).toMatch(/appointmentsCount:\s*g\._count\.id/);
    expect(src).not.toMatch(/appointmentsCount:\s*0/);
    expect(src).not.toMatch(/userGrowth:\s*\[\]/);
  });
});

describe('CI test boundaries and migrations', () => {
  it('generates OpenAPI from live schema sources rather than stale dist output', () => {
    const generator = read('scripts/generate-docs.ts');
    expect(generator).toMatch(
      /from ['"]\.\.\/packages\/shared\/src\/schemas\/openapi\.registry['"]/
    );
    expect(generator).not.toMatch(/from ['"]@ricton\/shared['"]/);
  });

  it('runs root contract tests by explicit path without force-exit', () => {
    const packageJson = read('package.json');
    expect(packageJson).toMatch(
      /"test:contracts"\s*:\s*"[^"]*--runTestsByPath tests\/\*\.test\.ts/
    );
    expect(packageJson).not.toMatch(/"test:contracts"\s*:\s*"[^"]*forceExit/);
    for (const workflow of ['.github/workflows/ci.yml', '.github/workflows/deploy-aws-ecr.yml']) {
      expect(read(workflow)).toMatch(/npm run test:contracts/);
    }
  });

  it('replays the migration chain on the isolated integration database', () => {
    const script = read('scripts/test-e2e.sh');
    expect(script).toMatch(/reset_test_database\s*\n\s*docker compose[^\n]+up -d/);
    expect(script).toMatch(/prisma migrate deploy/);
    expect(script).not.toMatch(/prisma db push/);
  });

  it('uses a migration-empty PostgreSQL image for the disposable test database', () => {
    const compose = read('docker-compose.test.yml');
    expect(compose).toMatch(/image:\s*postgres:16-alpine/);
    expect(compose).not.toMatch(/postgis\/postgis/);
  });

  it('isolates integration Redis from the developer stack', () => {
    const compose = read('docker-compose.test.yml');
    const script = read('scripts/test-e2e.sh');
    expect(compose).toMatch(/test-redis:/);
    expect(compose).toMatch(/127\.0\.0\.1:6381:6379/);
    expect(compose).toMatch(/--requirepass ricton_test_redis_password/);
    expect(script).toMatch(/REDIS_URL="redis:\/\/127\.0\.0\.1:6381"/);
    expect(script).toMatch(/REDIS_PASSWORD="ricton_test_redis_password"/);
  });
});

describe('Production artifacts are deployable and release-safe', () => {
  it('runs Prisma migrations from the schema copied into the DB image', () => {
    const dockerfile = read('packages/db/Dockerfile');
    expect(dockerfile).toMatch(/WORKDIR \/app\b/);
    expect(dockerfile).toMatch(
      /prisma["',\s]+migrate["',\s]+deploy["',\s]+--schema=packages\/db\/prisma\/schema\.prisma/
    );
    expect(dockerfile).not.toMatch(
      /WORKDIR \/app\/packages\/db[\s\S]*COPY --from=builder \/app\/packages\/db \.\/packages\/db/
    );
  });

  it('builds and deploys the web frontend with the same immutable release tag', () => {
    expect(fs.existsSync(path.join(root, 'apps/web/Dockerfile'))).toBe(true);

    const pushScript = read('scripts/aws-ecr-push.sh');
    expect(pushScript).toMatch(/IMAGE_TAG=/);
    expect(pushScript).toMatch(/ricton-web/);
    expect(pushScript).not.toMatch(/local image_tag=.*:latest/);

    const compose = read('docker-compose.prod.yml');
    expect(compose).toMatch(/web-service:/);
    expect(compose).toMatch(/ricton-web:\$\{IMAGE_TAG\}/);
    expect(compose).not.toMatch(/ricton-[a-z-]+:latest/);

    const dockerfile = read('apps/web/Dockerfile');
    expect(dockerfile).toMatch(/ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID/);
    expect(dockerfile).toMatch(/RUN test -n "\$NEXT_PUBLIC_GOOGLE_CLIENT_ID"/);
    expect(pushScript).toMatch(/--build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=/);
  });

  it('renders an autoscaling/v2 HPA whenever autoscaling is enabled', () => {
    const hpa = read('infra/helm/ricton-service/templates/hpa.yaml');
    expect(hpa).toMatch(/if \.Values\.autoscaling\.enabled/);
    expect(hpa).toMatch(/apiVersion:\s*autoscaling\/v2/);
    expect(hpa).toMatch(/minReplicas:\s*\{\{ \.Values\.autoscaling\.minReplicas \}\}/);
    expect(hpa).toMatch(/maxReplicas:\s*\{\{ \.Values\.autoscaling\.maxReplicas \}\}/);
    expect(hpa).toMatch(/targetCPUUtilizationPercentage/);
    expect(hpa).toMatch(/targetMemoryUtilizationPercentage/);
  });

  it('creates the service account referenced by the deployment', () => {
    expect(read('infra/helm/ricton-service/templates/serviceaccount.yaml')).toMatch(
      /if \.Values\.serviceAccount\.create[\s\S]*kind:\s*ServiceAccount/
    );
  });
});

describe('Shared-package imports have no queue side effects', () => {
  it('keeps BullMQ queues behind the explicit @ricton/shared/jobs subpath', () => {
    expect(read('packages/shared/src/index.ts')).not.toMatch(/export \* from ['"]\.\/jobs['"]/);
    expect(read('packages/shared/package.json')).toMatch(/"\.\/jobs"/);
    expect(read('services/payment/src/controllers/payment.controller.ts')).toMatch(
      /from ['"]@ricton\/shared\/jobs['"]/
    );
  });
});
