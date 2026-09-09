const jwt = require("jsonwebtoken");
const { requireAuth, requireManager } = require("../src/middleware/auth");

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe("requireAuth", () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  });

  it("rejects when there is no Authorization header", () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects a header that isn't a Bearer token", () => {
    const req = { headers: { authorization: "Basic abc123" } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  it("rejects an invalid token", () => {
    const req = { headers: { authorization: "Bearer not-a-real-jwt" } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts a valid token and attaches the payload to req.user", () => {
    const token = jwt.sign({ id: "abc", role: "employee" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe("abc");
    expect(req.user.role).toBe("employee");
  });
});

describe("requireManager", () => {
  it("rejects when req.user is missing", () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();
    requireManager(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an employee", () => {
    const req = { user: { role: "employee" } };
    const res = mockRes();
    const next = jest.fn();
    requireManager(req, res, next);
    expect(res.statusCode).toBe(403);
  });

  it("allows a manager through", () => {
    const req = { user: { role: "manager" } };
    const res = mockRes();
    const next = jest.fn();
    requireManager(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
