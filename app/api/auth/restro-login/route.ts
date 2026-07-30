// app/api/auth/restro-login/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import crypto from "crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createClient,
} from "@supabase/supabase-js";

import {
  createRestroSessionToken,
  getRestroSessionCookieOptions,
  RESTRO_SESSION_COOKIE,
} from "@/lib/restroSession";

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error(
      "Supabase server environment variables are missing"
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function cleanMobile(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replace(/\D/g, "")
    .slice(-10);
}

function cleanPassword(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function getUniversalAdminCredentials() {
  return {
    mobile: cleanMobile(
      process.env.UNIVERSAL_ADMIN_MOBILE
    ),
    password: cleanPassword(
      process.env.UNIVERSAL_ADMIN_PASSWORD
    ),
  };
}

function universalAdminData(
  mobile: string
) {
  return {
    Role: "UNIVERSAL_ADMIN",
    RestroCode: null,
    RestroName: "Railway Eats Admin",
    StationCode: "ALL",
    StationName: "All India",
    State: null,
    RestroLoginMobile: mobile,
    RestroUserName: "Railway Eats Admin",
    OwnerName: "Railway Eats Admin",
    RestroDisplayPhoto: null,
    Email: "support@raileats.in",
    Address:
      "Flat 2C, Third Floor, First Block, Mohali, Punjab 140603",
  };
}

function timingSafeTextEqual(
  left: string,
  right: string
) {
  const leftHash =
    crypto
      .createHash("sha256")
      .update(left)
      .digest();

  const rightHash =
    crypto
      .createHash("sha256")
      .update(right)
      .digest();

  return crypto.timingSafeEqual(
    leftHash,
    rightHash
  );
}

function safeRestroData(
  row: any
) {
  return {
    Role:
      "RESTRO",

    RestroCode:
      row?.RestroCode,

    RestroName:
      row?.RestroName ??
      null,

    StationCode:
      row?.StationCode ??
      null,

    StationName:
      row?.StationName ??
      null,

    State:
      row?.State ??
      null,

    RestroLoginMobile:
      cleanMobile(
        row?.RestroLoginMobile
      ),

    RestroUserName:
      row?.RestroUserName ??
      null,

    OwnerName:
      row?.OwnerName ??
      null,

    RestroDisplayPhoto:
      row?.RestroDisplayPhoto ??
      null,
  };
}

export async function POST(
  req: NextRequest
) {
  try {
    const body =
      await req
        .json()
        .catch(
          () => ({})
        );

    const mobile =
      cleanMobile(
        body.mobile ??
        body.Mobile
      );

    const password =
      cleanPassword(
        body.password ??
        body.Password
      );

    if (
      mobile.length !== 10 ||
      !password
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Valid 10-digit mobile number and password are required",
        },
        {
          status: 400,
        }
      );
    }

    const universal =
      getUniversalAdminCredentials();

    const isUniversalMobile =
      universal.mobile.length === 10 &&
      timingSafeTextEqual(
        mobile,
        universal.mobile
      );

    if (isUniversalMobile) {
      if (
        !universal.password ||
        !timingSafeTextEqual(
          password,
          universal.password
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Invalid mobile number or password",
          },
          {
            status: 401,
          }
        );
      }

      const token =
        createRestroSessionToken({
          role:
            "UNIVERSAL_ADMIN",
          restroCode:
            null,
          mobile,
        });

      const response =
        NextResponse.json(
          {
            ok: true,
            message:
              "Login successful",
            restro:
              universalAdminData(
                mobile
              ),
          },
          {
            status: 200,
          }
        );

      response.cookies.set(
        RESTRO_SESSION_COOKIE,
        token,
        getRestroSessionCookieOptions()
      );

      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate"
      );

      return response;
    }

    const supabase =
      supabaseServer();

    /*
     * select("*") use kiya hai taaki kisi optional/non-existent
     * column name ki wajah se poori login query fail na ho.
     */
    const {
      data: restro,
      error,
    } =
      await supabase
        .from(
          "RestroMaster"
        )
        .select("*")
        .eq(
          "RestroLoginMobile",
          mobile
        )
        .limit(1)
        .maybeSingle();

    if (error) {
      console.error(
        "RESTRO LOGIN DATABASE ERROR =>",
        error
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            error.message ||
            "Unable to verify login",
        },
        {
          status: 500,
        }
      );
    }

    const storedPassword =
      cleanPassword(
        restro?.RestroPassword
      );

    if (
      !restro ||
      !storedPassword ||
      !timingSafeTextEqual(
        password,
        storedPassword
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid mobile number or password",
        },
        {
          status: 401,
        }
      );
    }

    const restroCode =
      Number(
        restro.RestroCode
      );

    if (
      !Number.isFinite(
        restroCode
      ) ||
      restroCode <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Restaurant account is not configured correctly",
        },
        {
          status: 500,
        }
      );
    }

    const token =
      createRestroSessionToken(
        {
          role:
            "RESTRO",
          restroCode,
          mobile,
        }
      );

    const response =
      NextResponse.json(
        {
          ok: true,
          message:
            "Login successful",
          restro:
            safeRestroData(
              restro
            ),
        },
        {
          status: 200,
        }
      );

    response.cookies.set(
      RESTRO_SESSION_COOKIE,
      token,
      getRestroSessionCookieOptions()
    );

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    return response;
  } catch (
    error: any
  ) {
    console.error(
      "RESTRO LOGIN ERROR =>",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Login failed",
      },
      {
        status: 500,
      }
    );
  }
}
