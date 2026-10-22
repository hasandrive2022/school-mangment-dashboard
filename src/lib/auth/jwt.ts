import * as jose from "jose";
import { getSessionMaxAgeSeconds } from "./constants";

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload: {
  sub: string;
  email: string;
}): Promise<string> {
  const maxAge = getSessionMaxAgeSeconds();
  return await new jose.SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());
}

export type SessionPayload = {
  sub: string;
  schoolId: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  displayNameBn: string;
  tokenType: "access";
};

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    const sub = payload.sub;
    const schoolId = payload.schoolId;
    const role = payload.role;
    const displayNameBn = payload.displayNameBn;
    const tokenType = payload.tokenType;
    if (
      typeof sub !== "string" ||
      typeof schoolId !== "string" ||
      (role !== "ADMIN" && role !== "TEACHER" && role !== "STUDENT") ||
      typeof displayNameBn !== "string" ||
      tokenType !== "access"
    ) {
      return null;
    }
    return { sub, schoolId, role, displayNameBn, tokenType };
  } catch {
    return null;
  }
}
