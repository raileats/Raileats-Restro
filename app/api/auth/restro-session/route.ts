// app/api/auth/restro-session/route.ts

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  getRestroSession,
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

  if (
    !url ||
    !key
  ) {
    throw new Error(
      "Supabase server environment variables are missing"
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession:
          false,

        autoRefreshToken:
          false,
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
    .replace(
      /\D/g,
      ""
    )
    .slice(
      -10
    );
}

function safeRestroData(
  row: any
) {
  return {
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
        row
          ?.RestroLoginMobile
      ),

    RestroUserName:
      row?.RestroUserName ??
      null,

    OwnerName:
      row?.OwnerName ??
      null,

    RestroDisplayPhoto:
      row
        ?.RestroDisplayPhoto ??
      null,
  };
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    Pragma:
      "no-cache",

    Expires:
      "0",
  };
}

export async function GET() {
  try {
    const session =
      await getRestroSession();

    if (!session) {
      return NextResponse.json(
        {
          ok:
            false,

          authenticated:
            false,

          error:
            "Session expired",
        },
        {
          status:
            401,

          headers:
            noStoreHeaders(),
        }
      );
    }

    const supabase =
      supabaseServer();

    /*
     * Sirf confirmed existing columns select kiye gaye hain.
     * Password kabhi response me nahi aata.
     */
    const {
      data:
        restro,
      error,
    } =
      await supabase
        .from(
          "RestroMaster"
        )
        .select(
          `
            RestroCode,
            RestroName,
            StationCode,
            StationName,
            State,
            RestroLoginMobile,
            RestroUserName,
            OwnerName,
            RestroDisplayPhoto
          `
        )
        .eq(
          "RestroCode",
          session.restroCode
        )
        .limit(
          1
        )
        .maybeSingle();

    if (error) {
      console.error(
        "RESTRO SESSION DATABASE ERROR =>",
        error
      );

      return NextResponse.json(
        {
          ok:
            false,

          authenticated:
            true,

          error:
            error.message ||
            "Unable to load restaurant details",
        },
        {
          status:
            500,

          headers:
            noStoreHeaders(),
        }
      );
    }

    if (!restro) {
      return NextResponse.json(
        {
          ok:
            false,

          authenticated:
            false,

          error:
            "Restaurant not found",
        },
        {
          status:
            401,

          headers:
            noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        ok:
          true,

        authenticated:
          true,

        restro:
          safeRestroData(
            restro
          ),
      },
      {
        status:
          200,

        headers:
          noStoreHeaders(),
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "RESTRO SESSION ERROR =>",
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        authenticated:
          false,

        error:
          error?.message ||
          "Unable to verify session",
      },
      {
        status:
          500,

        headers:
          noStoreHeaders(),
      }
    );
  }
}
