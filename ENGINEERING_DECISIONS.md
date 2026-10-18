
# OPSPULSE — Engineering Decisions

## 1. Architecture

OPSPULSE uses a React and Vite frontend, an Express.js REST API, and PostgreSQL with Prisma ORM.

**Decision:** Keep the frontend and backend separate.

**Why:** This separates presentation from business rules and allows backend permissions to be enforced independently.

**Trade-off:** Two development servers and environment configuration are required.

## 2. Authentication and Team Authorization

Authentication uses JWT tokens and bcrypt password hashing. Team memberships define VIEWER, MEMBER, LEAD, and ADMIN roles.

**Decision:** Check team membership on protected work-item operations.

**Why:** A valid login alone should not grant access to another team's resources.

**Trade-off:** Authorization requires additional database queries.

## 3. Optimistic Concurrency Control

Each work item stores a version number. Updates require the current version and increment it atomically.

**Decision:** Reject stale updates with HTTP 409 Conflict.

**Why:** Prevents two users from silently overwriting each other's changes.

**Trade-off:** Clients must refresh and retry after conflicts.

## 4. Workflow Enforcement

Work items follow controlled status transitions:

OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED → CLOSED

Invalid transitions are rejected by the backend. Only LEAD and ADMIN roles can approve or close work items.

**Decision:** Enforce workflow rules on the server rather than relying only on the interface.

**Why:** Direct API requests must not bypass workflow restrictions.

**Trade-off:** The workflow is intentionally fixed rather than configurable per team.

## 5. Transactional Activity History

Work-item creation, updates, and comments generate activity events. These events are written in the same database transaction as the corresponding change.

**Decision:** Record activity history transactionally.

**Why:** Avoids successful work-item changes without matching history records.

**Trade-off:** Transactions add database work and storage overhead.

## Known Limitations

- Work-item listing currently has no server-side pagination or search.
- Workflow rules are fixed rather than customizable.
- The current API does not implement idempotency keys.
- Automated tests cover three critical correctness cases but not every endpoint.
- Production deployment and monitoring are not included.
