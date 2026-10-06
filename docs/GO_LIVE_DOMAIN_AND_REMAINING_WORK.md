# Ricton go-live: domain, deployment, and remaining work

**Last reviewed:** 2026-10-06  
**Purpose:** the practical path from the current local/AWS deployment to a secure, public Ricton application. This is intentionally explicit about what code already does, what an account owner must do, and what must be verified before accepting live traffic.

## The one missing piece

The web application and API need stable, separate public origins:

| Purpose                                                | Recommended hostname                          | Hosted by                         |
| ------------------------------------------------------ | --------------------------------------------- | --------------------------------- |
| Patient, provider, hospital, and administrator web app | `app.rictonhealth.com`                        | Vercel                            |
| Public API, webhooks, and Swagger                      | `api.rictonhealth.com`                        | AWS host running Kong             |
| Marketing/root address                                 | `rictonhealth.com` and `www.rictonhealth.com` | Vercel redirect or marketing site |

The browser must receive a Vercel-built frontend whose `NEXT_PUBLIC_API_URL` is `https://api.rictonhealth.com`. It then calls Kong at that API hostname. Kong routes every `/api/*` request to the private service containers. The API must authorize the Vercel origin in `ALLOWED_ORIGINS`, and any provider redirect/callback must name the real frontend or API hostname.

Do **not** point the same hostname at Vercel and the AWS host. DNS can only direct a hostname to one edge. Separating `app` and `api` makes TLS, CORS, provider callbacks, and debugging predictable.

## What the repository does today

### CI/CD

- [`.github/workflows/ci.yml`](/Users/apple/Documents/GitHub/Ricton/.github/workflows/ci.yml) runs linting, type checks, contract/integration tests, the web build, mobile tests, browser E2E, and Helm lint on pull requests and pushes.
- [`.github/workflows/deploy-aws-ecr.yml`](/Users/apple/Documents/GitHub/Ricton/.github/workflows/deploy-aws-ecr.yml) runs after pushes to `main` or `master`: it tests, builds immutable SHA-tagged Docker images, pushes them to ECR, copies the production Compose bundle to `STAGING_HOST` over SSH, snapshots RDS when present, migrates, deploys, and smoke-tests the services.
- The AWS deployment is currently a **single Docker Compose host**, not an ECS/EKS rollout. The workflow calls it “staging”; a production launch needs separate production credentials/host or an explicit decision that this host is production.
- Vercel is not configured in this repository yet: there is no `vercel.json`, linked project metadata, or Vercel deployment workflow. Vercel can safely deploy from its Git integration; it should be configured with `apps/web` as the Root Directory.

### AWS and API edge

- [docker-compose.prod.yml](/Users/apple/Documents/GitHub/Ricton/docker-compose.prod.yml) exposes Kong on host ports 80 and 443. The individual services stay on the internal Docker network; Kong's Admin API is not published.
- The deployment workflow renders an ACME/Let's Encrypt Kong configuration when both `API_DOMAIN` and `ACME_EMAIL` are set. Kong runs DB-less and uses Redis-backed ACME storage, which is appropriate for certificate persistence across restarts.
- The workflow attempts to add `A api.rictonhealth.com -> <STAGING_HOST IPv4>` when the parent zone is in Route 53 and then opens 80/443 on the matching EC2 security group. This is convenient but is not a replacement for confirming that the host has a stable Elastic IP, the correct Route 53 zone, and a network path to port 80/443.
- Terraform currently provisions VPC, RDS, ElastiCache, Secrets Manager, alarms, and WAF definitions. It does **not** provision the EC2 host, Elastic IP, ALB, Route 53 zone/records, ACM certificate, ECS service, or EKS cluster. The Helm chart is an alternative, currently unused deployment path; do not mix it with the Compose host for the same API hostname.

### Frontend and cross-origin behavior

- The browser API client uses `NEXT_PUBLIC_API_URL` as a build-time public gateway base and appends `/api/*`; therefore use `https://api.rictonhealth.com` without a trailing `/api`.
- `FRONTEND_URL` is used by Paystack wallet/payment/subscription success redirects. It must be `https://app.rictonhealth.com`.
- `ALLOWED_ORIGINS` is a comma-separated allowlist enforced by every service in production. The deployment workflow now derives the missing entry from `FRONTEND_URL`, rather than incorrectly allowlisting the API's own origin. Explicitly include `https://app.rictonhealth.com` and, temporarily, a Vercel QA origin if it is used.
- The Compose stack also starts a `ricton-web` container on port 3000. Once Vercel is canonical it is redundant, and port 3000 must not be public. Retaining it briefly for rollback is acceptable; make its security-group exposure private-only.

## Decisions required from the owner before cutover

1. The canonical domain is `rictonhealth.com`; use `app.rictonhealth.com` for the web application and `api.rictonhealth.com` for the API.
2. Confirm whether the current `STAGING_HOST` becomes production. If it does, attach an Elastic IP first. If it does not, provide the production host and the GitHub secrets that point to it.
3. Choose the supported AWS edge model:
   - **Current Compose model (fastest):** Route 53/external DNS `A` record to the host's Elastic IP; Kong obtains and renews the API certificate with ACME. Open only TCP 80/443 and restricted SSH.
   - **Future load-balanced model:** Route 53 alias to an ALB; ACM terminates TLS; the ALB forwards to Kong privately. Do not enable Kong ACME for that same hostname. This requires missing infrastructure code and should be a separate migration, not a launch-day substitution.
4. Ensure an owner has admin access to the DNS provider, Vercel project/team, AWS account, GitHub repository secrets, Google Cloud OAuth, Apple Developer, Paystack, LiveKit, Twilio, and SendGrid.

## Exact launch procedure

### 1. Prepare DNS and the AWS API endpoint — owner, with repository automation support

1. Allocate and associate a stable Elastic IP to the Compose EC2 host. Record it as `<API_IP>`.
2. In the DNS provider's authoritative zone, create `A api.rictonhealth.com -> <API_IP>` with a short TTL (for example 300) during cutover. If the zone is Route 53 and the deployment GitHub identity has permission, the workflow can upsert this record; still verify the result independently.
3. Ensure the EC2 security group allows TCP 80 and 443 from the internet, and allows TCP 22 only from approved operator IPs or a bastion/SSM. Do not expose service ports 3000–3017, Redis, Postgres, or Kong Admin.
4. Set GitHub repository secrets:

   - `API_DOMAIN=api.rictonhealth.com`
   - `ACME_EMAIL=<operations email>`
   - `NEXT_PUBLIC_API_URL=https://api.rictonhealth.com`
   - `FRONTEND_URL=https://app.rictonhealth.com`
   - `ALLOWED_ORIGINS=https://app.rictonhealth.com` (include an additional temporary QA origin only when needed)
   - production `STAGING_HOST`, `STAGING_USER`, and `STAGING_SSH_PRIVATE_KEY` until the workflow is renamed/split for production
   - all existing database, Redis, JWT, Paystack, OAuth, SMS, email, LiveKit, S3, Sentry, and AWS secrets.

5. Run the AWS deploy workflow. Its Kong render will request the certificate after public DNS points to the host. Confirm `https://api.rictonhealth.com/docs` and a public API health/smoke request both negotiate a valid certificate.
6. If ACME issuance fails, first check public DNS propagation and that inbound port 80 reaches Kong. Do not repeatedly redeploy: repeated failed ACME attempts can hit certificate-authority rate limits.

### 2. Create the Vercel project — owner

1. Import the GitHub repository into Vercel and set **Root Directory** to `apps/web`.
2. Use the repository's normal install/build detection (`npm ci` and the Next.js build); do not deploy the AWS Docker web image to Vercel.
3. Add the following Vercel Production environment variables:

   - `NEXT_PUBLIC_API_URL=https://api.rictonhealth.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<web OAuth client ID>`
   - `NEXT_PUBLIC_APPLE_CLIENT_ID=<Apple Service ID>` when Apple sign-in is enabled
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=<Paystack public key>` when browser checkout requires it.

   Public-prefixed variables are deliberately shipped to the browser; never put private provider keys, database URLs, JWT secrets, or Paystack secret keys in Vercel.

4. Add `app.rictonhealth.com` to Project Settings → Domains. Vercel will show the authoritative verification and DNS value. Create exactly that record at the DNS provider (normally a CNAME for a subdomain); do not hard-code a stale Vercel target from a blog post.
5. Add `rictonhealth.com` and `www.rictonhealth.com`, then redirect both to `https://app.rictonhealth.com`. Verify Vercel issues a certificate and the production deployment uses the new public API URL.

### 3. Update providers after both hosts are reachable — owner

| Provider                | Set to                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google OAuth web client | Authorized JavaScript origin `https://app.rictonhealth.com`; any configured authorized redirect URI must use the canonical web origin.                                                                              |
| Apple Sign in           | Service ID return URL/origin for the canonical Vercel app, as required by the configured Apple flow.                                                                                                                |
| Paystack                | Production secret/public keys; webhook URL on `https://api.rictonhealth.com` for the payment webhook route used by the service; confirm the return URL redirects to `https://app.rictonhealth.com/payments/verify`. |
| LiveKit                 | Webhook `https://api.rictonhealth.com/api/telemedicine/callbacks/status`; set the same value in `TELEMEDICINE_CALLBACK_URL`.                                                                                        |
| Twilio / SendGrid       | Verified production sender/phone/domain as applicable; update any callback/allowlist that names the prior host.                                                                                                     |
| S3                      | Bucket CORS policy must permit `https://app.rictonhealth.com` if the browser uploads directly; preserve least-privilege IAM.                                                                                        |

Exact provider dashboard labels differ by account and product tier. Test these in their sandbox/test modes before swapping the production keys.

### 4. Production acceptance gates — owner and engineering

Run these against the real hostnames, not localhost:

- Vercel domain verification and TLS are green; `https://app.rictonhealth.com` loads without mixed-content requests.
- `https://api.rictonhealth.com/docs` has a valid certificate and `GET /api/version` responds through Kong.
- Browser requests from the web app succeed with the expected CORS `Access-Control-Allow-Origin` value; a foreign origin is rejected.
- Google/Apple sign-in works using the production web host.
- A Paystack test transaction completes, lands on the verify screen, updates the consultation/payment state, and appears in wallet/payment history where applicable. Repeat webhook delivery once to confirm idempotency.
- A wallet top-up, wallet-funded consultation, withdrawal (sandbox where supported), and resulting ledger/history are checked using an isolated launch test user.
- LiveKit appointment lifecycle and signed callback complete over the API hostname.
- Patient, provider, pharmacy, hospital administrator, and Ricton super-administrator complete their seeded browser paths on the Vercel host.
- Logs/Sentry alerting are visible, RDS snapshot/restore ownership is understood, and a rollback deploy to the prior image SHA has been rehearsed.

## Work still remaining

The previously audited P0 payment, consultation, wallet, pharmacy, hospital-registration, super-admin, and role-interface work has been implemented and exercised locally during this workstream. It still needs the production acceptance gates above because local success cannot prove DNS, provider, account, or webhook configuration.

The remaining deliberate product/operations work is:

- **Document handling:** use production object storage for real provider/hospital verification documents, allow reviewers to inspect them securely, and support a clear reject/resubmit loop with audit evidence.
- **Money operations:** establish an operations-owned reconciliation process for Paystack, wallet ledger, consultation settlement, withdrawals, reversals/refunds, and provider payouts. Product flows need real production provider credentials and settlement policy before real money is accepted.
- **Organisation operations:** define hospital onboarding SLAs, membership invitation/removal, staffing/roster administration, and escalation ownership beyond the initial approval UI.
- **Production E2E:** add a protected, non-production browser environment that runs real hosted callback tests without touching live money or real patient data. Current CI has useful local/in-process coverage but cannot prove third-party redirect and DNS behavior.
- **Deployment consolidation:** choose Compose-on-EC2 or an infrastructure-managed ECS/EKS/ALB architecture. The Terraform/Helm documents describe parts of the latter but do not provision its compute/edge. Until that work is done, treat the Compose host as the authoritative runtime and document its backup, patching, monitoring, and incident owner.
- **Security and compliance launch review:** complete threat modeling, data retention/access policies, production backup/restore drill, secret rotation, IAM least-privilege review, health-data regulatory/legal review, and clinical/incident escalation processes. These are launch requirements, not code checkboxes.

## What I can do next in the repository

- Split the current `deploy-to-staging` workflow into explicit staging and production environments with GitHub Environment approvals and separate secrets.
- Add a deployment preflight that fails early when the configured public URLs, CORS origins, API domain, or callback URLs disagree.
- Remove/privatize the redundant AWS web container after Vercel is live, and add an external domain smoke test to CI/CD.
- Build Terraform for the selected AWS edge architecture once the owner chooses Compose + Elastic IP or ALB/ECS/EKS.
- Add a non-production hosted end-to-end suite and a launch runbook with named operational owners.

I cannot register a domain, alter public DNS, create/attach an Elastic IP, configure Vercel, change provider dashboards, or deploy real production credentials without access and explicit authorization. Those are intentionally owner-controlled external changes.

## References

- [Vercel: setting up a custom domain](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel: working with domains](https://vercel.com/docs/domains/working-with-domains)
- [AWS Route 53: creating records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html)
- [Kong ACME plugin](https://docs.konghq.com/hub/kong-inc/acme/)
