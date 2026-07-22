// app/api/restro/orders/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";
import { updateOrderJourneySafe } from "@/lib/orderJourney";

/* =========================================================
   SUPABASE SERVER CLIENT
========================================================= */

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  /*
   * Restaurant order APIs server-side hain.
   * Service-role key mandatory rakhi gayi hai taaki RLS ki wajah se
   * Orders aur OrderJourney update silently fail na ho.
   */
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url) {
    throw new Error(
      "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is missing",
    );
  }

  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing",
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/* =========================================================
   BASIC HELPERS
========================================================= */

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeRestroCode(value: unknown) {
  const numericValue = Number(
    String(value ?? "")
      .trim()
      .replace(/[^\d.-]/g, ""),
  );

  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
}

function getSessionRestroCode(session: any) {
  return normalizeRestroCode(
    session?.restroCode ??
      session?.RestroCode ??
      session?.restro_code ??
      session?.outletCode ??
      session?.OutletCode,
  );
}

function getSessionRestroUserName(
  session: any,
  order?: any,
) {
  return (
    cleanText(session?.restroUserName) ||
    cleanText(session?.RestroUserName) ||
    cleanText(session?.userName) ||
    cleanText(session?.UserName) ||
    cleanText(session?.name) ||
    cleanText(session?.Name) ||
    cleanText(session?.restroName) ||
    cleanText(session?.RestroName) ||
    cleanText(order?.RestroName) ||
    cleanText(order?.restroName) ||
    (getSessionRestroCode(session)
      ? `Restro ${getSessionRestroCode(session)}`
      : "Restro")
  );
}

function getBookingSource(order: any) {
  return (
    cleanText(order?.BookingSource) ||
    cleanText(order?.bookingSource) ||
    cleanText(order?.BookedSource) ||
    cleanText(order?.Source) ||
    "Website"
  );
}

/* =========================================================
   RESTAURANT ACTION MAPPING
========================================================= */

type RestroAction =
  | "accept"
  | "dispatch"
  | "reject"
  | "delivered"
  | "outcome"
  | "complaintresponse";

type ActionDefinition = {
  status: string;
  stage: string;
  defaultRemarks: string;
};

const ACTION_MAP: Record<RestroAction, ActionDefinition> = {
  accept: {
    status: "In Kitchen",
    stage: "In Kitchen",
    defaultRemarks: "Order accepted by restaurant",
  },

  dispatch: {
    status: "Out for Delivery",
    stage: "Out for Delivery",
    defaultRemarks: "Order dispatched by restaurant",
  },

  reject: {
    status: "Cancelled",
    stage: "Cancelled",
    defaultRemarks: "Order rejected by restaurant",
  },

  delivered: {
    status: "Restro Marked Delivered",
    stage: "Restro Marked Delivered",
    defaultRemarks: "Restaurant marked order as delivered",
  },

  /*
   * Restaurant kisi delivery issue ko directly finalise nahi karega.
   * Pehle complaint report hogi; admin final decision lega.
   */
  outcome: {
    status: "Complaints",
    stage: "Complaints",
    defaultRemarks: "Delivery issue reported by restaurant",
  },

  complaintresponse: {
    status: "Complaints",
    stage: "Complaints",
    defaultRemarks: "Restaurant responded to complaint",
  },
};

function normalizeRestroAction(
  value: unknown,
): RestroAction | null {
  const key = normalizeKey(value);

  const aliases: Record<string, RestroAction> = {
    accept: "accept",
    accepted: "accept",

    dispatch: "dispatch",
    dispatched: "dispatch",
    outfordelivery: "dispatch",

    reject: "reject",
    rejected: "reject",
    cancel: "reject",
    cancelled: "reject",
    canceled: "reject",

    delivered: "delivered",
    restromarkeddelivered: "delivered",

    outcome: "outcome",
    complaint: "outcome",
    complaints: "outcome",
    reportissue: "outcome",

    complaintresponse: "complaintresponse",
    respondcomplaint: "complaintresponse",
  };

  return aliases[key] || null;
}

/* =========================================================
   ORDER LOOKUP
========================================================= */

async function loadRestroOrder({
  supabase,
  orderId,
  restroCode,
}: {
  supabase: any;
  orderId: string;
  restroCode: number;
}) {
  return supabase
    .from("Orders")
    .select("*")
    .eq("OrderId", orderId)
    .eq("RestroCode", restroCode)
    .maybeSingle();
}

/* =========================================================
   BOOKED STAGE BACKFILL
========================================================= */

async function ensureBookedStage({
  supabase,
  order,
}: {
  supabase: any;
  order: any;
}) {
  const orderId =
    cleanText(order?.OrderId) ||
    cleanText(order?.orderId);

  if (!orderId) {
    return null;
  }

  /*
   * Existing row me Booked stage filled hai to helper usko overwrite
   * nahi karega. Missing ho to Orders table ke data se backfill karega.
   */
  return updateOrderJourneySafe({
    supabase,
    orderId,
    stage: "Booked",
    status:
      cleanText(order?.Status) ||
      cleanText(order?.status) ||
      "Booked",
    subStatus: null,
    remarks:
      cleanText(order?.BookingRemarks) ||
      cleanText(order?.bookingRemarks) ||
      "Order created",
    userType: "Customer",
    userName:
      cleanText(order?.CustomerName) ||
      cleanText(order?.customerName) ||
      "Customer",
    source: getBookingSource(order),
    actionAt:
      cleanText(order?.CreatedAt) ||
      cleanText(order?.createdAt) ||
      new Date().toISOString(),
    overwriteStage: false,
    order: {
      restroCode:
        order?.RestroCode ??
        order?.restroCode ??
        null,
      restroName:
        cleanText(
          order?.RestroName ??
            order?.restroName,
        ),
      stationCode:
        cleanText(
          order?.StationCode ??
            order?.stationCode,
        ),
      stationName:
        cleanText(
          order?.StationName ??
            order?.stationName,
        ),
      deliveryDate:
        cleanText(
          order?.DeliveryDate ??
            order?.deliveryDate,
        ),
      deliveryTime:
        cleanText(
          order?.DeliveryTime ??
            order?.deliveryTime,
        ),
    },
  });
}

/* =========================================================
   CENTRAL STATUS ROUTE
========================================================= */

async function callCentralStatusRoute({
  req,
  orderId,
  status,
  subStatus,
  remarks,
  restroUserName,
}: {
  req: NextRequest;
  orderId: string;
  status: string;
  subStatus: string | null;
  remarks: string | null;
  restroUserName: string;
}) {
  const targetUrl =
    new URL(
      `/api/orders/${encodeURIComponent(orderId)}/status`,
      req.nextUrl.origin,
    );

  const response =
    await fetch(targetUrl, {
      method: "PATCH",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        newStatus: status,
        subStatus,
        remarks,
        note: remarks,

        /*
         * Ye values OrderJourney me exact restaurant actor capture
         * karne ke liye central route ko bheji ja rahi hain.
         */
        userType: "Restro",
        userName: restroUserName,
        changedBy: restroUserName,
        actionSource: "Restro Panel",
      }),
    });

  const payload =
    await response
      .json()
      .catch(() => ({}));

  return {
    response,
    payload,
  };
}

/* =========================================================
   GET: RESTAURANT ORDERS
========================================================= */

export async function GET() {
  try {
    const session =
      await getRestroSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Session expired",
        },
        {
          status: 401,
        },
      );
    }

    const restroCode =
      getSessionRestroCode(session);

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid restaurant session",
        },
        {
          status: 401,
        },
      );
    }

    const supabase =
      supabaseServer();

    const {
      data,
      error,
    } =
      await supabase
        .from("Orders")
        .select("*")
        .eq(
          "RestroCode",
          restroCode,
        )
        .order(
          "CreatedAt",
          {
            ascending: false,
          },
        );

    if (error) {
      throw error;
    }

    const orders =
      data || [];

    const firstOrder =
      orders[0] || null;

    return NextResponse.json(
      {
        ok: true,
        orders,
        restro: {
          RestroCode:
            restroCode,
          RestroName:
            getSessionRestroUserName(
              session,
              firstOrder,
            ),
          StationCode:
            cleanText(
              session?.stationCode ??
                session?.StationCode ??
                firstOrder?.StationCode,
            ),
          StationName:
            cleanText(
              session?.stationName ??
                session?.StationName ??
                firstOrder?.StationName,
            ),
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error: any) {
    console.error(
      "RESTRO ORDERS GET ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to load orders",
      },
      {
        status: 500,
      },
    );
  }
}

/* =========================================================
   PATCH: RESTAURANT STATUS MARKING
========================================================= */

export async function PATCH(
  req: NextRequest,
) {
  try {
    const session =
      await getRestroSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Session expired",
        },
        {
          status: 401,
        },
      );
    }

    const restroCode =
      getSessionRestroCode(session);

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid restaurant session",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await req
        .json()
        .catch(() => ({}));

    const orderId =
      cleanText(
        body?.orderId ??
          body?.OrderId,
      );

    const action =
      normalizeRestroAction(
        body?.action ??
          body?.Action,
      );

    const subStatus =
      cleanText(
        body?.subStatus ??
          body?.SubStatus,
      );

    const suppliedRemarks =
      cleanText(
        body?.remarks ??
          body?.Remarks,
      );

    if (!orderId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "OrderId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!action) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid restaurant action",
        },
        {
          status: 400,
        },
      );
    }

    const actionDefinition =
      ACTION_MAP[action];

    /*
     * Reject, outcome aur complaint response ke liye reason mandatory.
     */
    if (
      (
        action === "reject" ||
        action === "outcome" ||
        action === "complaintresponse"
      ) &&
      !subStatus
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please select a reason",
        },
        {
          status: 400,
        },
      );
    }

    const supabase =
      supabaseServer();

    const {
      data: order,
      error: orderError,
    } =
      await loadRestroOrder({
        supabase,
        orderId,
        restroCode,
      });

    if (orderError) {
      throw orderError;
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Order not found for this restaurant",
        },
        {
          status: 404,
        },
      );
    }

    const restroUserName =
      getSessionRestroUserName(
        session,
        order,
      );

    const remarks =
      suppliedRemarks ||
      (
        subStatus
          ? `${actionDefinition.defaultRemarks}: ${subStatus}`
          : actionDefinition.defaultRemarks
      );

    /*
     * Purane order me Booked stage missing hai to current restaurant
     * action se pehle Customer actor ke saath backfill ho jayegi.
     */
    const bookedJourney =
      await ensureBookedStage({
        supabase,
        order,
      });

    const changedAt =
      new Date().toISOString();

    /*
     * Existing central status API ko use karne se penalty, IGST,
     * RestroRDS hard lock aur prepaid refund logic preserve rahega.
     */
    const {
      response,
      payload,
    } =
      await callCentralStatusRoute({
        req,
        orderId,
        status:
          actionDefinition.status,
        subStatus,
        remarks,
        restroUserName,
      });

    if (
      !response.ok ||
      !payload?.ok
    ) {
      return NextResponse.json(
        {
          ...payload,
          ok: false,
          error:
            payload?.error ||
            payload?.message ||
            "Unable to update order",
        },
        {
          status:
            response.status || 500,
        },
      );
    }

    /*
     * Safety enforcement:
     * Central route successful hone ke baad same stage ko explicit
     * Restro actor ke saath overwrite karte hain. Isse Admin fallback
     * ya purani wrong actor value permanently correct ho jayegi.
     */
    const enforcedJourney =
      await updateOrderJourneySafe({
        supabase,
        orderId,
        stage:
          actionDefinition.stage,
        status:
          actionDefinition.status,
        subStatus,
        remarks,
        userType: "Restro",
        userName:
          restroUserName,
        source:
          "Restro Panel",
        actionAt:
          changedAt,
        overwriteStage: true,
        order: {
          restroCode:
            order.RestroCode ??
            restroCode,
          restroName:
            cleanText(
              order.RestroName,
            ),
          stationCode:
            cleanText(
              order.StationCode,
            ),
          stationName:
            cleanText(
              order.StationName,
            ),
          deliveryDate:
            cleanText(
              order.DeliveryDate,
            ),
          deliveryTime:
            cleanText(
              order.DeliveryTime,
            ),
        },
      });

    if (!enforcedJourney) {
      /*
       * Status update ho chuka hai, lekin actor log fail hua to success
       * return karke silent nahi rahenge. UI clear warning dikhayegi.
       */
      return NextResponse.json(
        {
          ok: false,
          statusUpdated: true,
          error:
            "Order status updated, but Restro actor could not be captured in OrderJourney. Check server logs.",
          row:
            payload?.row ??
            null,
          bookedJourney:
            bookedJourney ??
            null,
          centralJourney:
            payload?.journey ??
            null,
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      row:
        payload?.row ??
        null,

      action,
      status:
        actionDefinition.status,
      subStatus,
      remarks,

      actor: {
        userType: "Restro",
        userName:
          restroUserName,
        source:
          "Restro Panel",
        restroCode,
      },

      bookedJourney:
        bookedJourney ??
        null,

      journey:
        enforcedJourney,

      restroRds:
        payload?.restroRds ??
        null,

      refund:
        payload?.refund ??
        null,
    });
  } catch (error: any) {
    console.error(
      "RESTRO ORDERS PATCH ERROR",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to update order",
      },
      {
        status: 500,
      },
    );
  }
}
