// proxy.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

const COOKIE_NAME =
  "raileats_restro_session";

const PROTECTED_ROUTES = [
  "/orders",
  "/menu",
  "/delivery-settings",
  "/profile",
  "/popular-restaurants-train-journey",
  "/ledger",
  "/dashboard",
];

function base64UrlToBytes(
  value: string
) {
  const normalized =
    value
      .replace(
        /-/g,
        "+"
      )
      .replace(
        /_/g,
        "/"
      );

  const padding =
    "=".repeat(
      (
        4 -
        (
          normalized.length %
          4
        )
      ) %
      4
    );

  const binary =
    atob(
      `${normalized}${padding}`
    );

  return Uint8Array.from(
    binary,
    (
      character
    ) =>
      character.charCodeAt(
        0
      )
  );
}

function bytesToBase64Url(
  bytes:
    Uint8Array
) {
  let binary =
    "";

  for (
    const byte of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(
    binary
  )
    .replace(
      /=/g,
      ""
    )
    .replace(
      /\+/g,
      "-"
    )
    .replace(
      /\//g,
      "_"
    );
}

function safeNextPath(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    ).trim();

  if (
    !text ||
    !text.startsWith("/") ||
    text.startsWith("//") ||
    text.startsWith("/api/") ||
    text === "/"
  ) {
    return "/orders";
  }

  const allowed =
    PROTECTED_ROUTES.some(
      (
        route
      ) =>
        text === route ||
        text.startsWith(
          `${route}/`
        ) ||
        text.startsWith(
          `${route}?`
        )
    );

  return allowed
    ? text
    : "/orders";
}

async function verifyToken(
  token:
    string | undefined
) {
  try {
    const secret =
      process.env
        .RESTRO_SESSION_SECRET;

    if (
      !token ||
      !secret ||
      secret.length <
        32
    ) {
      return false;
    }

    const [
      payloadPart,
      signaturePart,
      extra,
    ] =
      token.split(
        "."
      );

    if (
      !payloadPart ||
      !signaturePart ||
      extra
    ) {
      return false;
    }

    const key =
      await crypto.subtle.importKey(
        "raw",

        new TextEncoder()
          .encode(
            secret
          ),

        {
          name:
            "HMAC",

          hash:
            "SHA-256",
        },

        false,

        [
          "sign",
        ]
      );

    const expectedSignatureBuffer =
      await crypto.subtle.sign(
        "HMAC",

        key,

        new TextEncoder()
          .encode(
            payloadPart
          )
      );

    const expectedSignature =
      bytesToBase64Url(
        new Uint8Array(
          expectedSignatureBuffer
        )
      );

    if (
      expectedSignature !==
      signaturePart
    ) {
      return false;
    }

    const payloadText =
      new TextDecoder()
        .decode(
          base64UrlToBytes(
            payloadPart
          )
        );

    const payload =
      JSON.parse(
        payloadText
      );

    const validIdentity =
      payload?.role ===
        "UNIVERSAL_ADMIN" ||
      (
        Number.isFinite(
          payload?.restroCode
        ) &&
        payload.restroCode >
          0
      );

    return (
      validIdentity &&
      Number.isFinite(
        payload
          ?.expiresAt
      ) &&
      payload
        .expiresAt >
        Math.floor(
          Date.now() /
          1000
        )
    );
  } catch {
    return false;
  }
}

export async function proxy(
  request:
    NextRequest
) {
  const pathname =
    request
      .nextUrl
      .pathname;

  const isProtected =
    PROTECTED_ROUTES.some(
      (
        route
      ) =>
        pathname ===
          route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  const token =
    request.cookies.get(
      COOKIE_NAME
    )?.value;

  const authenticated =
    await verifyToken(
      token
    );

  if (
    isProtected &&
    !authenticated
  ) {
    const loginUrl =
      new URL(
        "/",
        request.url
      );

    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );

    const response =
      NextResponse.redirect(
        loginUrl
      );

    response.cookies.delete(
      COOKIE_NAME
    );

    return response;
  }

  /*
   * Authenticated user login page khole to requested `next`
   * route par bhejna hai. Hardcoded /orders nahi.
   */
  if (
    pathname ===
      "/" &&
    authenticated
  ) {
    const target =
      safeNextPath(
        request
          .nextUrl
          .searchParams
          .get(
            "next"
          )
      );

    return NextResponse.redirect(
      new URL(
        target,
        request.url
      )
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/orders/:path*",
    "/menu/:path*",
    "/delivery-settings/:path*",
    "/profile/:path*",
    "/popular-restaurants-train-journey/:path*",
    "/ledger/:path*",
    "/dashboard/:path*",
  ],
};
