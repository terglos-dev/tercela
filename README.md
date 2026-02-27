<div align="center">

# Tercela

**Open-source omnichannel platform for customer communication**

Connect channels like WhatsApp, manage conversations in real time, and organize contacts — all in a unified interface.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Bun](https://img.shields.io/badge/runtime-Bun-f9f1e1?logo=bun&logoColor=000)](https://bun.sh)
[![Hono](https://img.shields.io/badge/api-Hono-E36002?logo=hono&logoColor=fff)](https://hono.dev)
[![Nuxt](https://img.shields.io/badge/frontend-Nuxt_4-00DC82?logo=nuxt.js&logoColor=fff)](https://nuxt.com)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=fff)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/orm-Drizzle-C5F74F?logo=drizzle&logoColor=000)](https://orm.drizzle.team)

</div>

<!--
  Screenshots go here. Add images to .github/assets/ and reference them:

  ![Inbox](.github/assets/inbox.png)
  ![Channels](.github/assets/channels.png)
  ![Templates](.github/assets/templates.png)
-->

## Features

- **Omnichannel inbox** — Manage all conversations from a single dashboard
- **WhatsApp integration** — Send and receive messages via WhatsApp Cloud API
- **Message templates** — Create, view, edit and sync WhatsApp message templates with Meta
- **Real-time updates** — WebSocket-powered live messaging
- **Channel adapter pattern** — Extensible architecture to add new channels (Instagram, Webchat, etc.)
- **Contact management** — Centralized contact database with metadata
- **Agent assignment** — Route conversations to team members
- **Media storage** — S3-compatible storage for images, audio, video and documents
- **REST API with OpenAPI docs** — Interactive API reference via Scalar
- **Automatic migrations** — Versioned database migrations applied on boot
- **Docker-ready** — One command to run the entire stack

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | [Hono](https://hono.dev) + [Bun](https://bun.sh) |
| Frontend | [Nuxt 4](https://nuxt.com) + [Nuxt UI](https://ui.nuxt.com) |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| Real-time | Bun native WebSocket |
| Auth | JWT (HS256) |

## Prerequisites

- [Bun](https://bun.sh) >= 1.3
- [PostgreSQL](https://www.postgresql.org/) 15+ **or** [Docker](https://www.docker.com/)

## Quick Start with Docker

```bash
git clone https://github.com/terglos-dev/tercela.git
cd tercela
cp .env.example .env
docker compose up -d
```

Open http://localhost:3000 — API docs at http://localhost:3333/reference.

## Quick Start without Docker

```bash
# 1. Install dependencies
bun install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 3. Start in dev mode (auto-creates tables and seeds)
bun run dev
```

Open http://localhost:3000 — API docs at http://localhost:3333/reference.

## Default Credentials

| Email | Password |
|---|---|
| admin@tercela.com | admin123 |

> Change these immediately in production.

## Project Structure

```
tercela/
├── apps/
│   ├── api/            # Hono + Bun REST API (port 3333)
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── channels/     # Channel adapters (WhatsApp, ...)
│   │   │   ├── db/           # Drizzle schema & migrations
│   │   │   ├── middleware/    # Auth & error handling
│   │   │   └── ws/           # WebSocket handlers
│   │   └── Dockerfile
│   └── web/            # Nuxt 4 frontend (port 3000)
│       ├── app/
│       │   ├── pages/        # Application routes
│       │   ├── components/   # Vue components
│       │   └── layouts/      # Layout wrappers
│       └── Dockerfile
├── packages/
│   └── shared/         # Shared types, constants & utilities
├── docker-compose.yml
├── .env.example
└── package.json
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start API + Web in dev mode |
| `bun run dev:api` | Start API only |
| `bun run dev:web` | Start frontend only |
| `bun run db:generate` | Generate migration from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Seed database with initial data |
| `bun run docker:up` | Start all services via Docker |
| `bun run docker:down` | Stop Docker services |

## API Reference

With the server running, open http://localhost:3333/reference for the interactive API documentation (Scalar).

## Database Schemas

Tables are organized into named PostgreSQL schemas:

| Schema | Tables | Purpose |
|---|---|---|
| `auth` | users | Authentication & user management |
| `channels` | channels, templates | Communication channels & WhatsApp templates |
| `contacts` | contacts | Contact database |
| `inbox` | conversations, messages, conversation_reads | Conversation and message data |
| `config` | settings | Application settings |
| `storage` | media | Media file references |

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | — |
| `JWT_SECRET` | Secret key for JWT signing | — |
| `API_PORT` | API server port | `3333` |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook verification token | — |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp Cloud API access token | — |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp phone number ID | — |

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

See [NOTICE](NOTICE) for attribution details.
