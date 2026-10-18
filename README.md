
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

## Repository

https://github.com/Dhruv1312-tech/newtonite-ops-23SCSE1010687
