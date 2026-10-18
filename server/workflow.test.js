
const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, prisma } = require("./index");

const BASE_EMAIL = "testuser@opspulse.local";
const BASE_PASSWORD = "TestPass123!";

after(async () => {
  await prisma.$disconnect();
});

test("Reject invalid workflow transition OPEN to CLOSED", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email: BASE_EMAIL,
      password: BASE_PASSWORD
    });

  assert.equal(login.status, 200);

  const token = login.body.token;
  assert.ok(token);

  const profile = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(profile.status, 200);

  const operationsMembership = profile.body.user.memberships.find(
    (membership) => membership.team.name === "Operations Team"
  );

  assert.ok(operationsMembership, "Operations Team membership not found");

  const list = await request(app)
    .get(
      `/api/teams/${operationsMembership.team.id}/work-items`
    )
    .set("Authorization", `Bearer ${token}`);

  assert.equal(list.status, 200);

  const openItem = list.body.workItems.find(
    (item) => item.status === "OPEN"
  );

  assert.ok(openItem, "No OPEN work item found for testing");

  const response = await request(app)
    .patch(`/api/work-items/${openItem.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      status: "CLOSED",
      version: openItem.version
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


test("MEMBER cannot approve a work item", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email: "seconduser@opspulse.local",
      password: "TestPass456!"
    });

  assert.equal(login.status, 200);
  const token = login.body.token;

  const profile = await request(app)
    .get("/api/auth/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(profile.status, 200);

  const membership = profile.body.user.memberships.find(
    (m) => m.team.name === "Operations Team"
  );

  assert.ok(membership, "Operations Team membership not found");
  assert.equal(membership.role, "MEMBER");

  const list = await request(app)
    .get(`/api/teams/${membership.team.id}/work-items`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(list.status, 200);

  const item = list.body.workItems.find(
    (w) => w.status === "AWAITING_APPROVAL"
  );

  assert.ok(item, "No AWAITING_APPROVAL work item found");

  const response = await request(app)
    .patch(`/api/work-items/${item.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      status: "RESOLVED",
      version: item.version
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});


test("Reject stale work item updates with 409 Conflict", async () => {
  const login = await request(app)
    .post("/api/auth/login")
    .send({
      email: BASE_EMAIL,
      password: BASE_PASSWORD
    });

  assert.equal(login.status, 200);
  const token = login.body.token;
  const headers = { Authorization: `Bearer ${token}` };

  const profile = await request(app)
    .get("/api/auth/me")
    .set(headers);

  assert.equal(profile.status, 200);

  const membership = profile.body.user.memberships.find(
    (m) => m.team.name === "Operations Team"
  );

  assert.ok(membership, "Operations Team membership not found");

  const list = await request(app)
    .get(`/api/teams/${membership.team.id}/work-items`)
    .set(headers);

  assert.equal(list.status, 200);

  const item = list.body.workItems[0];
  assert.ok(item, "No work item found");

  const oldVersion = item.version;

  const firstUpdate = await request(app)
    .patch(`/api/work-items/${item.id}`)
    .set(headers)
    .send({
      priority: item.priority === "HIGH" ? "LOW" : "HIGH",
      version: oldVersion
    });

  assert.equal(firstUpdate.status, 200);

  const staleUpdate = await request(app)
    .patch(`/api/work-items/${item.id}`)
    .set(headers)
    .send({
      priority: "CRITICAL",
      version: oldVersion
    });

  assert.equal(staleUpdate.status, 409);
  assert.equal(staleUpdate.body.success, false);
});


