import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getEnv = () => ({
  PROJECT_URL:
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_PROJECT_URL,
  SERVICE_KEY:
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY,
});

const isRaileatsActive = (value: unknown) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "active";
};

function normalizeImageUrl(value: unknown, projectUrl: string) {
  const image = String(value ?? "").trim();

  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${projectUrl.replace(
    /\/$/,
    ""
  )}/storage/v1/object/public/restro/${image.replace(/^\/+/, "")}`;
}

export async function GET() {
  const { PROJECT_URL, SERVICE_KEY } = getEnv();

  try {
    if (!PROJECT_URL || !SERVICE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase configuration missing",
          data: [],
        },
        { status: 500 }
      );
    }

    const select = encodeURIComponent(
      [
        "RestroCode",
        "RestroName",
        "StationCode",
        "StationName",
        "RestroDisplayPhoto",
        "RaileatsStatus",
        "RestroRating",
        "MinimumOrderValue",
      ].join(",")
    );

    const apiUrl = `${PROJECT_URL.replace(
      /\/$/,
      ""
    )}/rest/v1/RestroMaster?select=${select}&RaileatsStatus=eq.1&limit=10`;

    const response = await fetch(apiUrl, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Supabase request failed",
          status: response.status,
          details: text,
          data: [],
        },
        { status: 502 }
      );
    }

    let rows: any[] = [];

    try {
      rows = JSON.parse(text);
    } catch {
      rows = [];
    }

    const activeRestaurants = (Array.isArray(rows) ? rows : [])
      .filter((restro) => isRaileatsActive(restro.RaileatsStatus))
      .filter((restro) => restro.RestroCode && restro.RestroName)
      .map((restro) => ({
        RestroCode: restro.RestroCode,
        RestroName: restro.RestroName,
        StationCode: restro.StationCode ?? "",
        StationName: restro.StationName ?? "",
        RestroDisplayPhoto:
          normalizeImageUrl(restro.RestroDisplayPhoto, PROJECT_URL) ||
          "/raileats-logo.png",
        RaileatsStatus: restro.RaileatsStatus,
        RestroRating: restro.RestroRating ?? null,
        MinimumOrderValue: restro.MinimumOrderValue ?? null,
      }));

    return NextResponse.json(
      {
        success: true,
        count: activeRestaurants.length,
        data: activeRestaurants,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unexpected server error",
        data: [],
      },
      { status: 500 }
    );
  }
}
