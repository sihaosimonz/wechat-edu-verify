# WeChat Verification System

This repository contains a reference implementation of a WeChat mini program and back‑end service that provide email‑based verification for joining community group chats. The system is designed to satisfy the requirements enumerated in the final implementation plan.

## Repository layout

```
wechat-verify-full/
├── apps/
│   ├── api/                # Fastify API implementation
│   ├── jobs/               # Background workers (invite expiry, JWKS rotation)
│   └── miniapp/            # WeChat mini program (pages & assets)
├── docs/                  # Technical documentation (assurance, JWT, ops, etc.)
├── .github/               # CI/CD workflows
└── README.md              # Project overview (this file)
```

### API (`apps/api`)

The API exposes endpoints for verifying student email addresses via one‑time codes, issuing short‑lived JWTs for access control, managing groups, uploading invites, handling moderator scans, and serving operational metrics. It is built with [Fastify](https://www.fastify.io/) and TypeScript. The implementation includes:

* **Rate limiting** with per‑email, per‑user, and per‑IP counters, exponential backoff, and soft lockouts.
* **Idempotency keys** on the OTP request endpoint to deduplicate repeated submissions.
* **OTP generation** (six digits), hashing (Argon2id), constant‑time verification, single‑use semantics, and time‑to‑live of ten minutes.
* **Verification store** that records the email domain, verification timestamp, validity window (default 120 days), and JWT identifier (jti).
* **JWT issuance and validation** using HS256 tokens, with standard claims (`iss`, `aud`, `nbf`, `exp`, `jti`) and revocation support.
* **Revoke and delete** endpoints to allow users to revoke a verification or delete their data.
* **Group management** routes to create groups, set verification policies, upload invites, and gate access using verification tokens.
* **Moderator and doorkeeper** routes to validate a user’s status via QR scan or lookup while masking personal information.
* **Email delivery** abstraction with stubbed SMTP (console) implementation and webhook endpoints for bounce/complaint suppression.
* **Metrics** exported via Prometheus counters.
* **Internationalisation (i18n)** middleware that selects message bundles based on the `Accept-Language` header and provides a translation function.

### Mini Program (`apps/miniapp`)

The mini program includes pages for:

* **Start**: introduction and privacy notice.
* **Email verification**: prompting the user for their university email and requesting a one‑time code.
* **OTP entry**: accepting the 6‑digit code and sending it to the API for confirmation.
* **Join**: showing the user’s verification status and, if verified, displaying the group invite QR or initiating auto‑admission via bot.
* **Profile**: showing the verified email domain and validity date, offering re‑verification and data deletion options.
* **Organizer console**: registering groups, performing ownership challenges, uploading invites, configuring policies, and viewing expiry reminders.
* **Moderator scan**: scanning a verification QR to display a green/red result with masked email domain and expiry date.

The mini program uses a simple i18n helper to display messages in English or Chinese based on device settings.

### Jobs (`apps/jobs`)

Background jobs are provided to:

* **Notify organizers** when a group invite is close to expiring (24 hours and 2 hours before expiry).
* **Rotate JWT signing keys** (JWKS) on a scheduled basis and handle revocation grace periods.
* **Purge expired OTPs, verifications, and logs** according to the data retention policy.

### How to run

1. Install dependencies:

```bash
cd apps/api
npm install
```

2. Copy `env/.env.example` to `.env` and set your configuration (SMTP credentials, JWT secret, etc.).

3. Compile TypeScript and start the API:

```bash
npm run build
npm start
```

4. Import `apps/miniapp` into the WeChat development tools to run the mini program.

> **Note:** The default implementation uses in‑memory stores for simplicity. For production use, configure Redis for rate limiting and idempotency, a relational database for persisting verification records and group data, and a real SMTP/SES provider for email delivery.
## Editor Setup

- **Extension**: qiu8310.minapp-vscode (recommended version: 2.4.14)
- **Workspace recommendation**: the repository includes [.vscode/extensions.json](.vscode/extensions.json) to prompt installation for contributors.
- **Install (local)**: run

```bash
code --install-extension qiu8310.minapp-vscode
```

- **Install (helper)**: from the `apps/api` folder you can run `npm run vscode:install-extensions` which executes the same `code` CLI install command (requires VS Code command‑line tools to be available).