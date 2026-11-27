import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const COOKIE = "manoir_admin";
function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET doit contenir au moins 32 caractères.");
  return new TextEncoder().encode(value);
}
export async function createAdminSession(email: string, role = "ADMIN") {
  const token = await new SignJWT({ email, role }).setProtectedHeader({ alg: "HS256" })
    .setIssuedAt().setExpirationTime("8h").sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 8 * 60 * 60 });
}
export async function getAdminSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret()); return payload; } catch { return null; }
}
export async function destroyAdminSession() {
  (await cookies()).delete(COOKIE);
}
