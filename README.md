<div align="center">

# 🛡️ PwnOps

**Automated Vulnerability Management & Incident Response Platform**

Real-time SOC dashboard for triaging incidents, tracking CVEs, and orchestrating infrastructure scans — built for security teams who ship fast and break nothing.

[![CI Pipeline](https://github.com/0xshellghost/pwnops/actions/workflows/ci.yml/badge.svg)](https://github.com/0xshellghost/pwnops/actions/workflows/ci.yml)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma)](https://prisma.io/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](https://pwnops.vercel.app) · [Report Bug](https://github.com/0xshellghost/pwnops/issues) · [Request Feature](https://github.com/0xshellghost/pwnops/issues)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scan Engine & Supported Tools](#-scan-engine--supported-tools)
- [Background Worker](#-background-worker)
- [API Reference](#-api-reference)
- [Authentication & Security](#-authentication--security)
- [Pre-Seeded Accounts](#-pre-seeded-accounts)
- [Testing & Linting](#-testing--linting)
- [Deployment](#-deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## Overview

PwnOps is a full-stack security operations platform that gives SOC teams a unified interface to:

- **Detect** — Run real vulnerability scans against live infrastructure using industry-standard tools.
- **Triage** — Manage incidents through a Kanban-style workflow with severity classification and assignment.
- **Track** — Monitor CVEs across your asset inventory with filtering, status tracking, and CVSS scoring.
- **Respond** — Receive instant notifications via Slack, Discord, PagerDuty, or custom webhooks when critical events occur.

It's designed to work out of the box with pre-installed scanning tools via Docker, while the web application can be deployed independently to Vercel or any Node.js host.

---

## ✨ Features

### Core Platform

| Feature | Description |
|---------|-------------|
| **Dashboard** | Real-time metrics — open incidents, running scans, critical vulnerabilities, and a live threat feed |
| **Incident Management** | Full CRUD with Kanban board, severity/status tracking, assignee management, and threaded comments |
| **Vulnerability Tracking** | CVE management with CVSS scoring, affected asset mapping, status workflow (`open` → `in_progress` → `fixed`) |
| **Asset Inventory** | Track endpoints, servers, networks, and cloud resources with tagging and status monitoring |
| **Scan Orchestration** | Launch, schedule (cron), and monitor security scans with terminal-style streaming output |
| **Integrations** | Webhook-based alerting for Slack, Discord, PagerDuty, and generic HTTP endpoints |

### Security & Auth

| Feature | Description |
|---------|-------------|
| **JWT Authentication** | Secure `HttpOnly`, `SameSite=Lax` cookie-based sessions with 24h expiry |
| **Multi-Factor Auth (2FA)** | TOTP-based two-factor authentication with QR code provisioning |
| **Role-Based Access Control** | Three roles — `admin`, `analyst`, `viewer` — enforced at the edge and API layer |
| **OAuth Providers** | GitHub and Google SSO integration |
| **API Keys** | Bearer token authentication for programmatic access with SHA-256 hashed storage |
| **Edge Security** | Rate limiting (Upstash Redis + in-memory fallback), CSRF protection, security headers (HSTS, CSP, X-Frame-Options, Permissions-Policy) |
| **DNS Rebinding Protection** | FQDN targets are resolved and validated against blocked IP ranges before scan execution |

### Design & UX

| Feature | Description |
|---------|-------------|
| **Cyber-Themed UI** | Dark mode with glassmorphism, neon accents, and scan-line animations |
| **Keyboard Shortcuts** | Global hotkeys for power users |
| **Responsive Layout** | Mobile-friendly sidebar with collapsible navigation |
| **SEO Optimized** | OpenGraph, Twitter cards, `robots.txt`, dynamic sitemap |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) — App Router, Server Components, Edge Proxy |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4, custom CSS variables |
| **Database** | PostgreSQL 15 via [Prisma ORM](https://prisma.io/) 7.8 (with `@prisma/adapter-pg`) |
| **Auth** | [`jose`](https://github.com/panva/jose) (JWT), [`bcryptjs`](https://github.com/nicolo-ribaudo/bcryptjs) (hashing), [`otplib`](https://github.com/yeojz/otplib) + [`qrcode`](https://github.com/soldair/node-qrcode) (2FA) |
| **Rate Limiting** | [Upstash Redis](https://upstash.com/) + `@upstash/ratelimit` (sliding window) |
| **Background Jobs** | Standalone Node.js worker via [`tsx`](https://github.com/privatenumber/tsx), [`cron-parser`](https://github.com/harrisiirak/cron-parser), [`ws`](https://github.com/websockets/ws) |
| **Email** | [Resend](https://resend.com/) API |
| **Containerization** | Docker & Docker Compose |
| **Reverse Proxy** | [Caddy](https://caddyserver.com/) (automatic HTTPS) |
| **CI/CD** | GitHub Actions |
| **E2E Testing** | [Playwright](https://playwright.dev/) |
| **Analytics** | [Vercel Analytics](https://vercel.com/analytics) |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                    │
│                  (Browser / API Consumers)                          │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  EDGE PROXY (proxy.ts)                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────┐  │
│  │ JWT Verify   │  │ Rate Limiter │  │ Security Headers + CSRF    │  │
│  └──────────────┘  └──────────────┘  └────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐  ┌──────────────────────────────────────────┐
│   NEXT.JS APP        │  │   REST API (/api/*)                      │
│  ┌────────────────┐  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ Dashboard      │  │  │  │ Auth     │ │ Scans    │ │ Incidents│ │
│  │ Incidents      │  │  │  │ Users    │ │ Vulns    │ │ Assets   │ │
│  │ Scans          │  │  │  │ Settings │ │ Integr.  │ │ Metrics  │ │
│  │ Vulnerabilities│  │  │  └──────────┘ └──────────┘ └──────────┘ │
│  │ Assets         │  │  └──────────────────┬───────────────────────┘
│  │ Integrations   │  │                     │
│  │ Users          │  │                     │
│  └────────────────┘  │                     │
└──────────────────────┘                     │
                                             ▼
                              ┌──────────────────────────┐
                              │   PostgreSQL (Prisma)    │
                              │   12 Models              │
                              └─────────────┬────────────┘
                                            │
                                            ▼
                              ┌──────────────────────────┐
                              │   BACKGROUND WORKER      │
                              │  ┌────────────────────┐  │
                              │  │ Poll for queued    │  │
                              │  │ scans → Execute    │  │
                              │  │ tools → Stream     │  │
                              │  │ results via WS     │  │
                              │  │ → Webhook alerts   │  │
                              │  └────────────────────┘  │
                              └──────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Docker** & **Docker Compose** (for database and scan worker)
- **npm** ≥ 9

### 1. Clone & Install

```bash
git clone https://github.com/0xshellghost/pwnops.git
cd pwnops
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings. At minimum, set:

```env
# Required
JWT_SECRET="$(openssl rand -base64 32)"
DATABASE_URL="postgresql://postgres:password123@localhost:5432/pwnops"

# Required for seeding
SEED_ADMIN_PASSWORD="YourStrongAdminPass!"
SEED_ANALYST_PASSWORD="YourStrongAnalystPass!"
SEED_VIEWER_PASSWORD="YourStrongViewerPass!"
```

### 3. Start Local Services

Spin up PostgreSQL and the background scan worker (pre-installed with all security tools):

```bash
docker compose up -d
```

### 4. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Seed the Database (First Run)

Navigate to `/api/seed` in your browser or call it via curl after starting the dev server. This creates the default organization and test accounts.

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with one of the [pre-seeded accounts](#-pre-seeded-accounts).

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | 256-bit secret for signing JWTs. Generate with `openssl rand -base64 32` |
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string (Supabase pooler or local Docker) |
| `NODE_ENV` | ❌ | `development` | Set to `production` to enable HSTS and `Secure` cookies |
| `UPSTASH_REDIS_REST_URL` | ❌ | — | Upstash Redis URL for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | ❌ | — | Upstash Redis token |
| `GITHUB_CLIENT_ID` | ❌ | — | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ❌ | — | GitHub OAuth App client secret |
| `GOOGLE_CLIENT_ID` | ❌ | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | — | Google OAuth client secret |
| `DISCORD_WEBHOOK_URL` | ❌ | — | Discord webhook for scan completion alerts |
| `RENDER_WORKER_URL` | ❌ | — | URL of the deployed scan worker (for tool availability checks) |
| `WORKER_API_KEY` | ❌ | — | Shared secret for authenticating worker ↔ API requests |
| `WORKER_POLL_INTERVAL` | ❌ | `3000` | Worker DB poll interval in milliseconds |
| `WORKER_MAX_CONCURRENT` | ❌ | `3` | Max concurrent scan executions per worker |
| `BLOCK_PRIVATE_SCANS` | ❌ | `false` | Block scans targeting RFC 1918 private IP ranges |
| `ALLOWED_REGISTRATION_DOMAINS` | ❌ | — | Comma-separated allowlist of email domains for registration |
| `SEED_ADMIN_PASSWORD` | ✅¹ | — | Password for the seeded admin account |
| `SEED_ANALYST_PASSWORD` | ✅¹ | — | Password for the seeded analyst account |
| `SEED_VIEWER_PASSWORD` | ✅¹ | — | Password for the seeded viewer account |

> ¹ Required only when seeding the database for the first time.

---

## 🔍 Scan Engine & Supported Tools

PwnOps includes a hardened scan engine (`lib/scan-engine.ts`) that executes real security tools with strict safety controls:

- **Input validation** — Targets must match IPv4, CIDR (`/16`–`/32`), or FQDN patterns
- **No shell interpolation** — Uses `execFile` (not `exec`) to prevent command injection
- **DNS rebinding protection** — FQDNs are resolved and checked against blocked ranges
- **Execution timeouts** — Each tool has a per-scan time limit
- **Whitelisted binaries** — Only registered tools can be executed

### Supported Tools

| Tool | Key | Description | Timeout |
|------|-----|-------------|---------|
| **Nmap** | `nmap` | TCP SYN scan with service/version detection | 5 min |
| **Nmap Recon** | `nmap-recon` | Host discovery scan across a subnet | 2 min |
| **testssl.sh** | `testssl` | Comprehensive SSL/TLS configuration audit | 10 min |
| **Lynis** | `lynis` | System hardening and configuration audit | 5 min |
| **Subfinder** | `subfinder` | Fast passive subdomain enumeration | 5 min |
| **Nuclei** | `nuclei` | Template-based vulnerability scanner (critical/high/medium) | 15 min |
| **WhatWeb** | `whatweb` | Technology stack detection and fingerprinting | 2 min |

All tools come **pre-installed** in the Docker worker image (`Dockerfile.worker`). For local development without Docker, install them on your host:

```bash
# Debian/Ubuntu
sudo apt install nmap testssl.sh lynis whatweb

# Subfinder & Nuclei (Go binaries)
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
```

---

## ⚙ Background Worker

The background worker (`worker/scan-worker.ts`) runs as a **standalone Node.js process**, decoupled from the Next.js runtime:

```
┌──────────────┐     poll      ┌──────────────┐    execute    ┌──────────────┐
│  PostgreSQL  │◄──────────────│    Worker     │──────────────►│  Scan Tools  │
│  (scan queue)│───────────────│  (scan-worker │◄──────────────│  (nmap, etc) │
└──────────────┘    update     │    .ts)       │    stdout     └──────────────┘
                               └──────┬───────┘
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                   ┌──────────────┐       ┌──────────────┐
                   │  WebSocket   │       │   Webhooks   │
                   │  (live UI)   │       │ (Slack/etc)  │
                   └──────────────┘       └──────────────┘
```

**How it works:**

1. Worker polls the database every `WORKER_POLL_INTERVAL` ms for scans with `status = 'queued'`
2. Claims a scan by atomically setting `status = 'running'`
3. Executes the tool binary via `execFile` with validated arguments
4. Streams progress updates to connected clients via WebSocket
5. Writes final results to the database and dispatches webhook notifications
6. Checks for due `ScheduledScan` entries and creates new queued scans from cron schedules

**Running the worker:**

```bash
# Via npm script
npm run worker:scan

# Or directly
npx tsx worker/scan-worker.ts
```

> **Production:** Use Docker Compose — the worker container comes with all scanning tools pre-installed and sandboxed.

---

## 📡 API Reference

All protected routes require a valid JWT cookie or `Authorization: Bearer <api-key>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Authenticate and receive JWT cookie |
| `POST` | `/api/auth/register` | Create new user account |
| `GET` | `/api/auth/me` | Get current authenticated user |
| `POST` | `/api/auth/forgot-password` | Request a password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `POST` | `/api/auth/2fa/setup` | Generate 2FA secret and QR code |
| `POST` | `/api/auth/2fa/verify` | Verify OTP and complete login |
| `GET` | `/api/auth/github` | Initiate GitHub OAuth flow |
| `GET` | `/api/auth/google` | Initiate Google OAuth flow |

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/incidents` | List or create incidents |
| `GET/PUT/DELETE` | `/api/incidents/[id]` | Get, update, or delete a specific incident |
| `GET/POST` | `/api/scans` | List or trigger scans |
| `GET` | `/api/scans/tools` | List available scanning tools |
| `POST` | `/api/scans/schedule` | Create a scheduled (cron) scan |
| `GET` | `/api/scans/ws-key` | Obtain a WebSocket authentication key |
| `GET` | `/api/vulnerabilities` | List vulnerabilities with filtering |
| `GET/POST` | `/api/assets` | List or register assets |
| `GET/PUT/DELETE` | `/api/assets/[id]` | Manage a specific asset |
| `GET/POST` | `/api/integrations` | List or create webhook integrations |
| `GET/PUT/DELETE` | `/api/integrations/[id]` | Manage a specific integration |
| `GET` | `/api/users` | List users in the organization |
| `GET` | `/api/dashboard/metrics` | Aggregated dashboard statistics |
| `GET/POST` | `/api/settings/apikeys` | Manage API keys |
| `POST` | `/api/seed` | Seed the database (first run only) |
| `GET` | `/api/health` | Health check endpoint |

---

## 🔒 Authentication & Security

### Authentication Flow

```
┌──────────┐   POST /api/auth/login   ┌──────────────┐
│  Client  │─────────────────────────►│  Auth API    │
│          │◄─────────────────────────│              │
│          │   Set-Cookie: JWT        │  ┌────────┐  │
│          │   (HttpOnly, SameSite)   │  │bcryptjs│  │
└──────────┘                          │  │  hash  │  │
     │                                │  │ verify │  │
     │  (2FA enabled?)                │  └────────┘  │
     │                                └──────────────┘
     │   POST /api/auth/2fa/verify
     │──────────────────────────────►  Verify TOTP
     │◄──────────────────────────────  Full JWT issued
```

### Security Layers

| Layer | Implementation |
|-------|---------------|
| **Edge Proxy** | `proxy.ts` — validates JWT, applies rate limits, sets security headers on every request |
| **Rate Limiting** | Sliding window via Upstash Redis (10 req/min for auth, 120 req/min for API). Falls back to in-memory if Redis is unavailable |
| **CSRF Protection** | Origin header validation on all `POST`/`PUT`/`DELETE` requests |
| **Security Headers** | `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`, `Content-Security-Policy`, `Permissions-Policy` |
| **HSTS** | Enabled in production with `max-age=63072000; includeSubDomains; preload` |
| **Password Storage** | `bcryptjs` with cost factor 12 |
| **API Key Storage** | SHA-256 hashed — raw keys are never stored |

---

## 👤 Pre-Seeded Accounts

The database seeder creates these accounts for development and testing. Override passwords via environment variables.

| Role | Email | Default Password | Permissions |
|------|-------|-----------------|-------------|
| **Admin** | `admin@pwnops.sec` | `PwnOps!Admin#2026` | Full access — user management, all CRUD, scans |
| **Analyst** | `j.doe@pwnops.sec` | `PwnOps!Analyst#2026` | Incident & scan management, vulnerability tracking |
| **Viewer** | `viewer@pwnops.sec` | `PwnOps!Viewer#2026` | Read-only access to all dashboards |

> **⚠️ Warning:** Change these passwords immediately after first login in any non-local environment.

---

## 🧪 Testing & Linting

### Linting

```bash
npm run lint
```

### End-to-End Tests

PwnOps uses [Playwright](https://playwright.dev/) for E2E testing against a real browser:

```bash
# Install browser binaries (first time)
npx playwright install --with-deps chromium

# Run tests
npx playwright test

# View HTML report
npx playwright show-report
```

### CI Pipeline

The GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs on every push and PR:

1. **Lint** — ESLint with Next.js rules
2. **Build** — Full production build
3. **Test** — Playwright E2E suite against a PostgreSQL service container

---

## 🚢 Deployment

### Vercel (Recommended for Web App)

The Next.js frontend deploys to Vercel with zero configuration. Set your environment variables in the Vercel dashboard and connect your GitHub repo.

> **Note:** The scan worker must be deployed separately — it requires system-level security tools that aren't available in serverless environments.

### Docker (Full Stack)

#### Development

```bash
docker compose up -d          # PostgreSQL + scan worker
npm run dev                   # Next.js dev server
```

#### Production

```bash
# Build and start the worker + Caddy reverse proxy (automatic HTTPS)
docker compose -f docker-compose.prod.yml up -d --build

# Build and start the Next.js app
npm run build
npm start
```

Ensure `NODE_ENV=production` is set to activate:
- `Secure` cookie flag
- HSTS headers
- Strict security headers

### Production Checklist

- [ ] Generate a strong `JWT_SECRET` (`openssl rand -base64 32`)
- [ ] Use a managed PostgreSQL instance (e.g., Supabase, Neon, RDS)
- [ ] Configure Upstash Redis for distributed rate limiting
- [ ] Set `BLOCK_PRIVATE_SCANS=true` to prevent internal network scanning
- [ ] Change all default seed passwords
- [ ] Set `ALLOWED_REGISTRATION_DOMAINS` to restrict sign-ups
- [ ] Configure webhook integrations for scan/incident alerts
- [ ] Enable 2FA for all admin accounts

---

## 📁 Project Structure

```
pwnops/
├── app/                          # Next.js 16 App Router
│   ├── api/                      # REST API endpoints
│   │   ├── auth/                 # Login, register, 2FA, OAuth, password reset
│   │   ├── scans/                # Scan CRUD, scheduling, tool listing, WS keys
│   │   ├── incidents/            # Incident CRUD with comments
│   │   ├── vulnerabilities/      # CVE tracking and status management
│   │   ├── assets/               # Asset inventory CRUD
│   │   ├── integrations/         # Webhook integration management
│   │   ├── users/                # User listing and role management
│   │   ├── settings/apikeys/     # API key generation and management
│   │   ├── dashboard/metrics/    # Aggregated dashboard statistics
│   │   ├── seed/                 # Database seeder endpoint
│   │   ├── health/               # Health check
│   │   └── simulate-threat/      # Threat simulation for testing
│   ├── dashboard/                # Protected dashboard pages
│   │   ├── scans/                # Scan list, detail view, report
│   │   ├── incidents/            # Incident list with detail modal
│   │   ├── vulnerabilities/      # Vulnerability table
│   │   ├── assets/               # Asset inventory
│   │   ├── integrations/         # Integration management
│   │   └── users/                # User management (admin)
│   ├── login/                    # Login page
│   ├── register/                 # Registration page
│   ├── forgot-password/          # Password recovery
│   ├── reset-password/           # Password reset (with token)
│   ├── docs/                     # Documentation page
│   ├── api-docs/                 # API documentation page
│   ├── status/                   # System status page
│   └── support/                  # Support/contact page
├── components/                   # Shared React components
│   ├── AuthProvider.tsx          # Client-side auth context
│   └── KeyboardShortcuts.tsx     # Global keyboard shortcuts
├── hooks/                        # Custom React hooks
│   └── useEscapeKey.ts           # ESC key handler
├── lib/                          # Core utilities
│   ├── auth.ts                   # JWT signing/verification, cookie handling
│   ├── scan-engine.ts            # Tool registry, input validation, execution
│   ├── store.ts                  # Prisma client, CRUD operations, seeding
│   ├── types.ts                  # TypeScript type definitions
│   └── webhooks.ts               # Webhook dispatch (Slack/Discord/PagerDuty)
├── prisma/
│   └── schema.prisma             # Database schema (12 models)
├── worker/
│   └── scan-worker.ts            # Background scan execution worker
├── tests/
│   └── auth.spec.ts              # Playwright E2E tests
├── proxy.ts                      # Edge proxy (auth, rate limiting, headers)
├── Dockerfile.worker             # Worker container with security tools
├── docker-compose.yml            # Dev: PostgreSQL + worker
├── docker-compose.prod.yml       # Prod: Worker + Caddy (auto-HTTPS)
├── Caddyfile                     # Caddy reverse proxy config
└── .github/workflows/ci.yml     # CI pipeline (lint → build → test)
```

---

## 🤝 Contributing

Contributions are welcome! To get started:

1. **Fork** the repository
2. **Create a feature branch** — `git checkout -b feat/my-feature`
3. **Commit your changes** — `git commit -m "feat: add my feature"`
4. **Push** — `git push origin feat/my-feature`
5. **Open a Pull Request**

Please ensure your code passes `npm run lint` and all Playwright tests before submitting.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with 🖤 by [0xshellghost](https://github.com/0xshellghost)**

</div>
