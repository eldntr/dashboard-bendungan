import crypto from "crypto";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123";
}

export function verifyAdminPassword(password: string): boolean {
  const expected = getAdminPassword();
  return password === expected;
}

export function getAdminToken(): string {
  const secret = getAdminPassword();
  return crypto.createHash("sha256").update(`admin-auth-session:${secret}`).digest("hex");
}

export function isValidAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  return token === getAdminToken();
}
