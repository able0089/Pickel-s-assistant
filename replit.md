# replit.md

## Overview

ShinyHunt Manager is a full-stack web application that serves as a dashboard for managing a Discord bot. The bot automates channel permission management for Pokémon spawn events in Discord servers — specifically locking/unlocking channels when rare Pokémon (shinies) are detected. The web dashboard provides real-time bot status monitoring, configuration management (guild ID, target user, detection role, source bot ID, admin role), and a system activity log.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state (API data fetching, caching, mutations)
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for page transitions and layout animations
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Styling**: Tailwind CSS with CSS variables for theming (dark mode cyberpunk aesthetic), custom fonts (Outfit, Plus Jakarta Sans, JetBrains Mono)
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx`
- **Discord Bot**: discord.js v14 running in the same process as the Express server
- **API Pattern**: RESTful JSON API under `/api/` prefix. Routes are defined declaratively in `shared/routes.ts` with Zod schemas for input validation and response typing — shared between client and server.
- **Storage Layer**: A `DatabaseStorage` class in `server/storage.ts` implements the `IStorage` interface, providing an abstraction over database operations.

### Database
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema location**: `shared/schema.ts` — contains two tables:
  - `bot_configs`: Stores Discord bot configuration (guild ID, target user ID, detection role ID, source bot ID, admin role ID, system enabled flag)
  - `logs`: Stores bot activity logs (type, message, channel name, timestamp)
- **Migrations**: Generated via `drizzle-kit` to `./migrations/` directory
- **Push command**: `npm run db:push` applies schema directly

### API Routes
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/status` | Bot online status and uptime |
| GET | `/api/config` | Retrieve bot configuration |
| POST | `/api/config` | Create or update bot configuration |
| GET | `/api/logs` | List recent activity logs (limit 50) |

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production build**: Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- **Scripts**: `dev` (development), `build` (production build), `start` (run production), `db:push` (apply schema)

### Key Design Decisions
1. **Shared schema and route definitions** between client and server via the `shared/` directory — ensures type safety across the stack and validates both request inputs and response shapes with Zod.
2. **Bot runs in-process** with the web server rather than as a separate service — simplifies deployment but means bot availability is tied to the web server lifecycle.
3. **Single config row pattern** — the `bot_configs` table stores exactly one row that gets upserted on updates, serving as a singleton configuration store.

## External Dependencies

### Required Services
- **PostgreSQL Database**: Connection via `DATABASE_URL` environment variable. Must be provisioned before the app can start.
- **Discord Bot**: Requires `DISCORD_TOKEN` environment variable. The bot uses discord.js v14 with Guilds, GuildMessages, and MessageContent intents. If the token is not set, the bot simply won't start (non-fatal).

### Key NPM Packages
- `discord.js` — Discord bot framework
- `drizzle-orm` + `drizzle-kit` — Database ORM and migration tooling
- `express` — HTTP server
- `@tanstack/react-query` — Client-side data fetching
- `framer-motion` — Animations
- `react-hook-form` + `zod` — Form handling and validation
- `wouter` — Client-side routing
- `date-fns` — Date formatting
- `connect-pg-simple` — PostgreSQL session store (available but sessions not currently active)