const request = require("supertest");
const app = require("../src/app");

describe("GET /api/health", () => {
  it("responds with ok status and does not require auth", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.time).toBe("string");
  });
});

describe("unknown route", () => {
  it("returns 404 for a route that doesn't exist", async () => {
    const res = await request(app).get("/api/not-a-real-route");
    expect(res.status).toBe(404);
  });
});
