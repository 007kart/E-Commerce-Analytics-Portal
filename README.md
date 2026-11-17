# CommercePulse — E-Commerce Analytics Portal

**A full-stack JavaScript Next.js portfolio application.** Responsive React dashboard, **Next.js App Router route handlers** for all backend APIs, PostgreSQL, analytics queries, order processing and CSV exports. **No Python or FastAPI.**

> This is an independent demo using synthetic data, not company code or real customer records. Do not claim real AWS deployment or sub-100ms benchmark without measuring it in a deployed environment.

## Features
- Revenue, orders, customers and average-order-value metrics for 7/30/90 days
- Sales trend chart, product leaderboard, revenue by category, fulfillment status distribution
- Searchable customer/order list, status filtering, server-side pagination
- Create a sample order: validated customer inputs, PostgreSQL transaction and row-level stock locking
- CSV export of orders (with spreadsheet-formula escaping)
- 240 synthetic orders, 24 customers, 12 products seeded automatically
- Responsive light dashboard, accessible controls, descriptive empty/error/loading states
- Native Next.js API routes and PostgreSQL (Node `pg`) — backend and frontend are both JavaScript

## Run locally

Prerequisites: **Node.js 20+**, **Docker Desktop**. Starting the database does not require the frontend to use Docker.

```bash
cp .env.example .env.local
npm install
docker compose up -d
npm run db:setup
npm run dev
```

Open **http://localhost:3000**. For DBeaver: localhost:5441, database `commercepulse`, username `portfolio`, password `portfolio` (**local development only**).

> The setup script reads `DATABASE_URL` from the shell environment. To make it available to the script, run `set -a; . ./.env.local; set +a` in bash before `npm run db:setup`, or prefix the command with `DATABASE_URL=postgresql://portfolio:portfolio@localhost:5441/commercepulse`. Next.js itself automatically reads `.env.local`.

To reset demo data: `docker compose down -v`, then start PostgreSQL and run `npm run db:setup` again. The setup script never overwrites a database that already has orders.

## Next.js API routes

| Method | Path | What it does |
|---|---|---|
| GET | `/api/dashboard?days=30` | Metrics, trend data, products, categories |
| GET | `/api/orders?search=&status=all&page=1` | Paginated filtered orders |
| POST | `/api/orders` | Transactional order creation and stock update |
| GET | `/api/orders/export` | CSV export |
| GET | `/api/products` | Available catalog |

**Sample POST body:** `{"customerName":"Demo Buyer","email":"demo@example.com","productId":1,"quantity":2}`

## Verify

```bash
npm test
npm run build
```

Unit tests cover input validation, CSV escaping, and date filtering. **Database integration and production deployment require a running PostgreSQL database**.

## Production notes

Before public deployment implement authentication, authorization, CSRF/abuse protections, rate limiting, audited order workflows, managed secrets, real order/payment integrations and an externally hosted PostgreSQL database. Configure a hosting provider that supports Next.js Node.js server functions (e.g. Vercel), and set `DATABASE_URL` as a server-side environment variable.
