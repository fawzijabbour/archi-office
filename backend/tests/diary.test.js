const request = require("supertest");
const app = require("../src/app");

describe("diary routes require auth", () => {
  const protectedRequests = [
    () => request(app).get("/api/diary/mine"),
    () => request(app).get("/api/diary/project/some-id"),
    () => request(app).get("/api/diary/employee/some-id"),
    () => request(app).post("/api/diary").send({}),
  ];

  it("all reject with 401 when no Authorization header is sent", async () => {
    for (const makeRequest of protectedRequests) {
      const res = await makeRequest();
      expect(res.status).toBe(401);
    }
  });
});
