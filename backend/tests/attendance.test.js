const request = require("supertest");
const app = require("../src/app");

describe("POST /api/attendance/scan", () => {
  it("rejects a request with no qr_token", async () => {
    const res = await request(app).post("/api/attendance/scan").send({ event_type: "check_in" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid event_type before looking up the token", async () => {
    const res = await request(app)
      .post("/api/attendance/scan")
      .send({ qr_token: "anything", event_type: "not_a_real_event" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid event_type/i);
  });
});
