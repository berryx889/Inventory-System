# Production deployment

StockFlow is a fully online Node.js application. Docker is optional and is only used by `docker-compose.yml` to make a local PostgreSQL database convenient. Production should use a managed PostgreSQL service.

## Required environment

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
SESSION_SECRET=GENERATE_A_RANDOM_SECRET_WITH_AT_LEAST_32_CHARACTERS
NODE_ENV=production
```

Generate a session secret with `openssl rand -base64 48`. Store it in the hosting provider's secret manager, never in Git.

## Build and release

Use Node.js 20 or newer.

```bash
npm ci
npm run db:migrate:deploy
npm run build
npm start
```

The application exposes `/api/health`. Configure the host health check to use that path. A `200` response means both the web process and PostgreSQL are available.

## Hosting options

- Vercel: import the repository, add the environment variables, and run `npm run db:migrate:deploy` from the release pipeline before promoting the deployment.
- Render, Railway, Fly.io, or a VPS: use the build and release commands above. The Next.js standalone output is enabled.
- A container platform may use the optional Docker setup, but Docker is not required to install or deploy StockFlow.

## Mandatory go-live checklist

1. Replace all seeded passwords and remove accounts that are not needed.
2. Use a managed PostgreSQL database with daily backups and point-in-time recovery.
3. Verify HTTPS and secure cookies on the public domain.
4. Restrict database network access to the application host.
5. Run `npm run db:migrate:deploy` once per release, before new code receives traffic.
6. Monitor `/api/health`, application errors, database capacity, and failed logins.
7. Test camera permission on the real HTTPS domain; browsers normally block camera access on insecure HTTP origins other than localhost.
8. Export and retain stock movement reports according to the company's audit policy.
