# PwnOps

PwnOps is a high-fidelity, high-performance automated vulnerability management and incident response platform. It provides a real-time dashboard for SOC (Security Operations Center) teams to triage incidents, manage vulnerabilities, and orchestrate infrastructure scans.

## Features

- **Cyber-Themed Design System**: Built with Tailwind CSS 4, featuring glassmorphism, neon accents, and custom animations.
- **Incident Management**: Interactive drag-and-drop Kanban board for incident triage.
- **Vulnerability Tracking**: Advanced data tables for managing CVEs with real-time filtering.
- **Tool Orchestration**: Trigger and monitor real security scans with terminal-style streaming output. Includes out-of-the-box support for Nmap, TestSSL, Lynis, WhatWeb, Subfinder, and Nuclei.
- **Background Scan Workers**: Standalone worker processes decoupled from the web app for polling and executing resource-intensive scan jobs via WebSockets.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with strict route protection via a custom Next.js Edge Proxy.
- **Advanced Authentication**: Multi-Factor Authentication (2FA) with OTP generation and secure password hashing.
- **Email Notifications**: Seamless email integration utilizing Resend.
- **Edge Security & Performance**: Redis-backed rate limiting (via Upstash), comprehensive security headers (HSTS, CSP, X-Frame-Options), and optimized caching.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Styling**: Tailwind CSS 4
- **Database & ORM**: PostgreSQL via Prisma ORM
- **Authentication**: JWT via `jose`, `bcryptjs` for hashing, `otplib` & `qrcode` for 2FA
- **Caching & Rate Limiting**: Upstash Redis & `@upstash/ratelimit`
- **Background Worker**: Standalone Node.js process using `tsx`, `cron-parser` for scheduling, and `ws` for real-time WebSockets
- **Email Delivery**: Resend API
- **Deployment & Infrastructure**: Docker & Docker Compose for sandboxing workers, Caddy for reverse proxying
- **Testing**: Playwright for End-to-End (E2E) testing

## Architecture & Folder Structure

PwnOps is designed with a modern monorepo-style structure, decoupling the frontend from background workers:

- `app/`: Next.js 16 App Router for all frontend pages and layouts.
- `app/api/`: REST API endpoints handling features like `auth`, `incidents`, `scans`, `vulnerabilities`, and `integrations`.
- `components/`: Reusable React server and client components (UI, layout, forms).
- `lib/`: Core utilities, including the scan-engine, database connections, and session management.
- `prisma/`: Database schema, migrations, and seeder configurations.
- `worker/`: Standalone background worker (`scan-worker.ts`) for executing intensive scan jobs.
- `tests/`: End-to-end tests using Playwright.

## API Routes & Authentication Flow

PwnOps secures all endpoints and pages using an advanced edge proxy configuration.

- **Authentication Flow**: 
  1. Users authenticate via `/api/auth/login`.
  2. A secure, `HttpOnly`, `SameSite=Lax` JWT cookie is issued.
  3. Edge proxy (`proxy.ts`) intercepts incoming requests and validates the token.
- **API Overview**:
  - `/api/auth/*`: Login, logout, and token validation.
  - `/api/scans/*`: Endpoints to trigger, schedule, and fetch security scan results.
  - `/api/incidents/*`: Manage incident tickets and Kanban board states.
  - `/api/vulnerabilities/*`: Fetch and manage CVE data.

## Background Worker Processes

The background worker (`worker/scan-worker.ts`) is a crucial component that executes security scans outside the Next.js runtime. 

- **How it Works**: The worker constantly polls the PostgreSQL database for queued scans. Upon claiming a scan, it executes the relevant tool (e.g., `nmap`), updates the database with live progress via WebSockets, and dispatches enterprise webhook alerts (Slack/Discord) upon completion.
- **Running the Worker**: 
  The worker requires external scanning tools installed on the host machine.
  ```bash
  npm run worker:scan
  ```
  *(Or execute via `npx tsx worker/scan-worker.ts`)*

## Getting Started (Local Development)

The easiest way to run PwnOps locally is by using Docker to spin up the PostgreSQL database and the Background Scan Worker (which comes pre-installed with all required security tools).

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
   *Note: Edit `.env.local` and change `DATABASE_URL` to point to the local Docker database: `postgresql://postgres:password123@localhost:5432/pwnops`*

3. **Start Local Services (Database & Worker)**
   Use Docker Compose to start the local PostgreSQL database and the background scan worker:
   ```bash
   docker compose up -d
   ```

4. **Initialize the Database**
   Push the schema to your new local database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the Development Server**
   Start the Next.js frontend:
   ```bash
   npm run dev
   ```
   Navigate to [http://localhost:3000](http://localhost:3000).

## Linting & Testing

PwnOps maintains strict code quality and reliability through ESLint and Playwright.

- **Linting**: Ensure code conforms to the Next.js and custom rules by running:
  ```bash
  npm run lint
  ```
- **Testing**: End-to-end testing is configured via Playwright (`playwright.config.ts`).
  ```bash
  # Run Playwright tests
  npx playwright test
  # View test report
  npx playwright show-report
  ```

## Pre-Seeded Accounts

The database seeder initializes with the following accounts for testing. You can override the default passwords via environment variables (`SEED_ADMIN_PASSWORD`, `SEED_ANALYST_PASSWORD`, `SEED_VIEWER_PASSWORD`).

| Role       | Email                | Default Password           | Access Level                    |
|------------|----------------------|----------------------------|---------------------------------|
| Admin      | `admin@pwnops.sec`   | `PwnOps!Admin#2026`       | Full access, user management    |
| Analyst    | `j.doe@pwnops.sec`   | `PwnOps!Analyst#2026`     | Incident & scan management      |
| Viewer     | `viewer@pwnops.sec`  | `PwnOps!Viewer#2026`      | Read-only access                |

> **⚠️ Important:** Change these passwords immediately after first login in production environments.

## Production Deployment

To run PwnOps in a production environment:

1. Create an optimized production build:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

Ensure `NODE_ENV=production` is set to activate strict security headers.

## Architecture Notes

- **Proxy/Middleware**: Route protection and rate limiting are handled efficiently at the edge using `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- **Data Persistence**: Uses PostgreSQL via Prisma ORM for robust data management.
- **Security**: Form submissions use CSRF protection (Next.js defaults) and cookie-based authentication with `HttpOnly` and `SameSite=Lax` attributes.
