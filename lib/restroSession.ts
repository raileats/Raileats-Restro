import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";

export const RESTRO_SESSION_COOKIE = "raileats_restro_session";
export const RESTRO_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type RestroSessionRole = "RESTRO" | "UNIVERSAL_ADMIN";

export type RestroSessionPayload = {
  role: RestroSessionRole;
  restroCode: number | null;
  mobile: string;
  issuedAt: number;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.RESTRO_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "RESTRO_SESSION_SECRET is missing or too short. Use at least 32 random characters.",
    );
  }

  return secret;
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signPayload(encodedPayload: string) {
  return encodeBase64Url(
    crypto
      .createHmac("sha256", getSessionSecret())
      .update(encodedPayload)
      .digest(),
  );
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createRestroSessionToken(input: {
  role?: RestroSessionRole;
  restroCode?: number | null;
  mobile: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const role = input.role ?? "RESTRO";

  const payload: RestroSessionPayload = {
    role,
    restroCode:
      role === "UNIVERSAL_ADMIN" ? null : Number(input.restroCode),
    mobile: input.mobile,
    issuedAt: now,
    expiresAt: now + RESTRO_SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyRestroSessionToken(
  token: string | null | undefined,
): RestroSessionPayload | null {
  try {
    if (!token) return null;

    const [encodedPayload, receivedSignature, extra] = token.split(".");

    if (!encodedPayload || !receivedSignature || extra) {
      return null;
    }

    const expectedSignature = signPayload(encodedPayload);

    if (!safeEqual(receivedSignature, expectedSignature)) {
      return null;
    }

    const payload = JSON.parse(
      decodeBase64Url(encodedPayload),
    ) as RestroSessionPayload;

    const role: RestroSessionRole =
      payload.role === "UNIVERSAL_ADMIN"
        ? "UNIVERSAL_ADMIN"
        : "RESTRO";
    const validRestroCode =
      role === "UNIVERSAL_ADMIN" ||
      (Number.isFinite(payload.restroCode) &&
        Number(payload.restroCode) > 0);

    if (
      !validRestroCode ||
      !payload.mobile ||
      !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return {
      ...payload,
      role,
      restroCode:
        role === "UNIVERSAL_ADMIN"
          ? null
          : Number(payload.restroCode),
    };
  } catch {
    return null;
  }
}

export async function getRestroSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(RESTRO_SESSION_COOKIE)?.value;
  return verifyRestroSessionToken(token);
}

export function getRestroSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: RESTRO_SESSION_MAX_AGE_SECONDS,
  };
}
