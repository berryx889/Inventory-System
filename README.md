# StockFlow Warehouse System

Online-first warehouse inventory and staff supply management for cleaning-service operations.

## Current milestone

- Responsive warehouse dashboard
- PostgreSQL/Prisma schema for users, employees, assignments, clients, locations, inventory, receipts, issues, returns, movements, alerts, and audit logs
- Password authentication with secure HTTP-only sessions
- Backend role and permission enforcement
- Employee QR token/manual ID lookup endpoint
- Inventory listing and automatic stock-status calculation
- Atomic multi-item stock issue and receipt services
- Serializable database transactions and optimistic stock version checks
- Movement, audit, and low/out-of-stock notification creation within the stock transaction
- Seed data matching the product scenario

The app is intentionally fully online. The database is the sole inventory authority. A lost connection causes a stock-changing request to fail; the client must fetch current state before retrying. There is no offline queue, local inventory mutation, or synchronization layer.

## Local setup

Requirements: Node.js 20+ and Docker, or an existing PostgreSQL database.

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate -- --name initial
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

Seeding requires private `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values. Production bootstrap creates only that administrator unless `SEED_DEMO_DATA="true"` is explicitly enabled. The login screen never publishes or prefills credentials.

## Production requirements

- Managed PostgreSQL with backups and point-in-time recovery
- A random `SESSION_SECRET` of at least 32 characters
- HTTPS at the load balancer or hosting platform
- Database migrations executed during the release process
- Secure secret storage; never commit `.env`
- Connection monitoring and user-visible online/offline state

See [DEPLOYMENT.md](./DEPLOYMENT.md) for platform-neutral build, release, health-check, security, and go-live instructions. Docker is optional and not required in production.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```

All three checks pass for this milestone.

## Next implementation increments

1. Connect dashboard metrics and activity tables to live data.
2. Build the authenticated app shell and login screen.
3. Build inventory, clients, locations, and employee management screens.
4. Complete Quick Issue with camera QR scanning and review/confirm states.
5. Add receive and return screens, including original-issue validation.
6. Add transaction search, reports, CSV exports, audit log, and alert center.
7. Add integration tests against PostgreSQL and browser end-to-end tests.
