const request = require("supertest");
const app = require("../src/app");

describe("POST /api/auth/login", () => {
  it("rejects a request with no email or password before touching the database", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email and password/i);
  });

  it("rejects a request missing only the password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "someone@archi.local" });
    expect(res.status).toBe(400);
  });
});

describe("routes that require a Bearer token", () => {
  const protectedRequests = [
    () => request(app).get("/api/auth/me"),
    () => request(app).post("/api/auth/register-employee").send({}),
    () => request(app).patch("/api/auth/change-password").send({}),
    () => request(app).get("/api/users"),
    () => request(app).get("/api/projects"),
  ];

  it("all reject with 401 when no Authorization header is sent", async () => {
    for (const makeRequest of protectedRequests) {
      const res = await makeRequest();
      expect(res.status).toBe(401);
    }
  });

  it("rejects a malformed token", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/auth/change-password", () => {
  it("requires auth before validating the body", async () => {
    const res = await request(app).patch("/api/auth/change-password").send({ new_password: "short" });
    expect(res.status).toBe(401);
  });
});
