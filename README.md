# E-Commerce Analytics Portal

**Next.js · React · TypeScript · Python FastAPI · SQL · PostgreSQL · Docker · AWS deployment-ready structure**

A full-stack portfolio recreation of the analytics workflows described on my resume. This is an independent **demo using synthetic data**, not an export of a real employer's code or customer data. No real integrations, transactions, AWS environment, or latency benchmarks are claimed.

## Features
- Interactive sales overview: revenue, orders, active customers, average order value
- Daily sales trend graph, best-selling products ranked by revenue
- Searchable/paginated orders table with status filtering
- Export orders to CSV, add demo orders with backend validation
- PostgreSQL schema with customers, products, orders, order_items
- 225 synthetic orders seeded on first startup
- REST API documented with Swagger/OpenAPI
- Responsive frontend with polished dashboard presentation
- Isolated API tests using in-memory SQLite; PostgreSQL used in Docker runtime

## Run locally

**Prerequisites:** Docker Engine + Docker Compose, Node.js 20+.

1. Start the Postgres database and FastAPI backend: `docker compose up --build -d`
2. In another terminal: `cd frontend && cp .env.example .env.local && npm install && npm run dev`
3. Open **http://localhost:3000**; API Swagger docs: **http://localhost:8000/docs**
4. Optional DBeaver connection: host `localhost`, port `5441`, database `ecommerce_demo`, username/password `demo` (dev only).
5. Reset demo data: `docker compose down -v` then `docker compose up --build`.

## API
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/overview?days=30` | KPIs |
| GET | `/api/trends?days=30` | Daily revenue/orders |
| GET | `/api/top-products?days=30` | Top sellers |
| GET | `/api/orders?status=paid&search=...&page=1` | Paginated orders |
| GET | `/api/orders/export` | CSV export |
| POST | `/api/orders` | Create synthetic order |

## Backend tests

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

## Stack explanation for interviews
- Next.js dashboard calls FastAPI REST endpoints.
- SQLAlchemy generates SQL against a relational PostgreSQL schema; DBeaver can inspect it.
- API aggregates order and order-item data for sales trends and KPI cards.
- CSV reports make transaction tables accessible to business teams.
- App is containerized to make future deployment on AWS ECS/EC2 possible (not yet deployed).

## Production gaps
Add authentication/authorization, database migrations (Alembic), caching, rate limiting, audit logs, CI tests, monitoring, request performance measurement, and safe multi-tenant data handling before a public production deployment. No payment processing is included.

**Resume integrity:** An independent demo cannot substantiate past employer-specific claims such as 'sub-100 ms' or real business impact. Only list such metrics if independently measured and verifiable.
