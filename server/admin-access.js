import { timingSafeEqual } from "node:crypto";

// No administrative writes are accepted until a strong server-side key is configured.
// Never put ADMIN_API_KEY in Vite, source control, MongoDB documents or browser storage.
export function isAdminConfigured() {
  return typeof process.env.ADMIN_API_KEY === "string" &&
    Buffer.byteLength(process.env.ADMIN_API_KEY, "utf8") >= 24;
}

export function hasAdminAccess(req) {
  if (!isAdminConfigured()) return false;
  const supplied = req.get("x-admin-key");
  if (typeof supplied !== "string") return false;
  const expected = Buffer.from(process.env.ADMIN_API_KEY, "utf8");
  const actual = Buffer.from(supplied, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function requireAdmin(req, res, next) {
  if (!isAdminConfigured()) {
    return res.status(503).json({ error: "Admin publishing is disabled. Configure ADMIN_API_KEY on the server." });
  }
  if (!hasAdminAccess(req)) {
    return res.status(401).json({ error: "A valid Admin key is required." });
  }
  next();
}
