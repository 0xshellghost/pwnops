# PwnOps

PwnOps is a high-fidelity, high-performance automated vulnerability management and incident response platform. It provides a real-time dashboard for SOC (Security Operations Center) teams to triage incidents, manage vulnerabilities, and orchestrate infrastructure scans.

## Features

- **Cyber-Themed Design System**: Built with Tailwind CSS 4, featuring glassmorphism, neon accents, and custom animations.
- **Incident Management**: Interactive drag-and-drop Kanban board for incident triage.
- **Vulnerability Tracking**: Advanced data tables for managing CVEs with real-time filtering.
- **Tool Orchestration**: Trigger and monitor simulated security scans with terminal-style output.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with strict route protection via Next.js Proxy.
- **Edge Security**: Comprehensive security headers (HSTS, CSP, X-Frame-Options) and rate limiting.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Styling**: Tailwind CSS 4
- **Authentication**: JWT (JSON Web Tokens) via `jose`, bcryptjs for password hashing
- **State**: In-memory singleton (`lib/store.ts`) for demonstration purposes

## Getting Started

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Configuration**
   Copy the example environment file and set your secure `JWT_SECRET`.
   \`\`\`bash
   cp .env.example .env.local
   \`\`\`

3. **Development Server**
   Start the development server with Turbopack:
   \`\`\`bash
   npm run dev
   \`\`\`
   Navigate to [http://localhost:3000](http://localhost:3000).

## Pre-Seeded Accounts

The in-memory datastore initializes with the following accounts for testing:

| Role       | Email                | Password      | Access Level                    |
|------------|----------------------|---------------|---------------------------------|
| Admin      | \`admin@pwnops.sec\`   | \`admin123\`    | Full access, user management    |
| Analyst    | \`j.doe@pwnops.sec\`   | \`analyst123\`  | Incident & scan management      |
| Analyst    | \`m.smith@pwnops.sec\` | \`analyst123\`  | Incident & scan management      |
| Viewer     | \`viewer@pwnops.sec\`  | \`viewer123\`   | Read-only access                |

## Production Deployment

To run PwnOps in a production environment:

1. Create an optimized production build:
   \`\`\`bash
   npm run build
   \`\`\`

2. Start the production server:
   \`\`\`bash
   npm start
   \`\`\`

Ensure `NODE_ENV=production` is set to activate strict security headers.

## Architecture Notes

- **Proxy/Middleware**: Route protection and rate limiting are handled efficiently at the edge using `proxy.ts` (the Next.js 16 replacement for `middleware.ts`).
- **Data Persistence**: The current implementation uses an in-memory `store.ts` to simulate a database. For true production use, swap out the repository methods in `store.ts` with an ORM like Prisma (e.g., connecting to PostgreSQL).
- **Security**: Form submissions use CSRF protection (Next.js defaults) and cookie-based authentication with `HttpOnly` and `SameSite=Lax` attributes.
