
# OPSPULSE

A team operations management application for tracking tasks, incidents, assignments, comments, and activity history.

## Tech Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express.js
- Database: PostgreSQL
- ORM: Prisma
- Authentication: JWT and bcryptjs

## Features

- User registration and login
- JWT-based authentication
- Team creation and membership management
- Role-based access control: VIEWER, MEMBER, LEAD, ADMIN
- Task and incident creation
- Work item priority and status updates
- Team member assignment
- Comments on work items
- Activity history
- Optimistic concurrency control using version numbers

## Project Structure

- `client/` — React frontend
- `server/` — Express backend and Prisma database configuration

## Prerequisites

- Node.js and npm
- PostgreSQL

## Setup

Clone the repository:

```bash
git clone https://github.com/Dhruv1312-tech/newtonite-ops-23SCSE1010687.git
cd newtonite-ops-23SCSE1010687
```

Install backend dependencies:

```bash
cd server
npm install
```

Create `server/.env` with your own values:

```env
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/opspulse_db?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
```

Apply database migrations and generate the Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend:

```bash
node index.js
```

In another terminal, install and start the frontend:

```bash
cd client
npm install
npm run dev
```

Open the local URL shown by Vite, typically `http://localhost:5173`.

The backend runs on `http://localhost:5001`.

## Production Build

```bash
cd client
npm run build
```

## Notes

- Never commit `.env` files or real credentials.
- Team membership determines access to work items.
- Work item updates use version checks to prevent stale overwrites.
- The application currently uses local development URLs.


## Workflow Rules

OPSPULSE enforces work item status transitions on the backend:

OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED → CLOSED

- Invalid status transitions are rejected.
- Work items awaiting approval can be returned to IN_PROGRESS.
- Only team LEAD and ADMIN roles can approve or close work items.
- Stale updates are rejected with HTTP 409 Conflict.

## Automated Tests

The backend includes automated tests for three important correctness behaviours:

1. Rejecting invalid workflow transitions.
2. Preventing MEMBER users from approving work items.
3. Rejecting stale-version updates with HTTP 409 Conflict.

Run the tests from the server directory:

```bash
cd server
node --test workflow.test.js
```

The current tests use development database records, including test users and work items.

## Engineering Decisions

See [ENGINEERING_DECISIONS.md](ENGINEERING_DECISIONS.md) for architecture decisions, authorization rules, concurrency handling, workflow enforcement, trade-offs, and limitations.

## Known Limitations

- Work item listing does not yet support server-side search or pagination.
- Workflow rules are fixed rather than configurable.
- Idempotency keys are not implemented.
- Automated tests do not cover every API endpoint.
- The application is configured for local development and has not been production deployed.

## Repository

https://github.com/Dhruv1312-tech/newtonite-ops-23SCSE1010687
