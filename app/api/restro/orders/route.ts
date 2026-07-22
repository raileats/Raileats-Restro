// app/api/restro/orders/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

/* =========================================================
   SUPABASE SERVER CLIENT
========================================================= */

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

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

function getRestroUserName(
  session: any,
  order?: any,
) {
  return (
    cleanText(session?.restroUserName) ||
    cleanText(session?.RestroUserName) ||
    cleanText(session?.userName) ||
    cleanText(session?.UserName) ||
    cleanText(session?.username) ||
    cleanText(session?.Username) ||
    cleanText(session?.name) ||
    cleanText(session?.Name) ||
    cleanText(session?.restroName) ||
    cleanText(session?.RestroName) ||
    cleanText(order?.RestroName) ||
    cleanText(order?.restroName) ||
    (
      getSessionRestroCode(session)
        ? `Restro ${getSessionRestroCode(session)}`
        : "Restro"
    )
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

function getOrderCreatedAt(order: any) {
  return (
    cleanText(order?.CreatedAt) ||
    cleanText(order?.created_at) ||
    cleanText(order?.createdAt) ||
    new Date().toISOString()
  );
}

/* =========================================================
   ACTION MAPPING
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
  journeyStage: string;
  defaultRemarks: string;
};

const ACTION_MAP: Record<RestroAction, ActionDefinition> = {
  accept: {
    status: "In Kitchen",
    journeyStage: "In Kitchen",
    defaultRemarks: "Order accepted by restaurant",
  },

  dispatch: {
    status: "Out for Delivery",
    journeyStage: "Out for Delivery",
    defaultRemarks: "Order dispatched by restaurant",
  },

  reject: {
    status: "Cancelled",
    journeyStage: "Cancelled",
    defaultRemarks: "Order rejected by restaurant",
  },

  delivered: {
    status: "Restro Marked Delivered",
    journeyStage: "Restro Marked Delivered",
    defaultRemarks: "Restaurant marked order as delivered",
  },

  outcome: {
    status: "Complaints",
    journeyStage: "Complaints",
    defaultRemarks: "Delivery issue reported by restaurant",
  },

  complaintresponse: {
    status: "Complaints",
    journeyStage: "Complaints",
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
   JOURNEY COLUMN MAPPING
========================================================= */

type JourneyColumns = {
  update: string;
  status: string;
  subStatus: string;
  remarks: string;
  userType: string;
  userName: string;
  source: string;
};

const JOURNEY_COLUMNS: Record<string, JourneyColumns> = {
  booked: {
    update: "BookedUpdate",
    status: "BookedStatus",
    subStatus: "BookedSubStatus",
    remarks: "BookedRemarks",
    userType: "BookedUserType",
    userName: "BookedUserName",
    source: "BookedSource",
  },

  inkitchen: {
    update: "InKitchenUpdate",
    status: "InKitchenStatus",
    subStatus: "InKitchenSubStatus",
    remarks: "InKitchenRemarks",
    userType: "InKitchenUserType",
    userName: "InKitchenUserName",
    source: "InKitchenSource",
  },

  outfordelivery: {
    update: "OutForDeliveryUpdate",
    status: "OutForDeliveryStatus",
    subStatus: "OutForDeliverySubStatus",
    remarks: "OutForDeliveryRemarks",
    userType: "OutForDeliveryUserType",
    userName: "OutForDeliveryUserName",
    source: "OutForDeliverySource",
  },

  restromarkeddelivered: {
    update: "RestroMarkedDeliveredUpdate",
    status: "RestroMarkedDeliveredStatus",
    subStatus: "RestroMarkedDeliveredSubStatus",
    remarks: "RestroMarkedDeliveredRemarks",
    userType: "RestroMarkedDeliveredUserType",
    userName: "RestroMarkedDeliveredUserName",
    source: "RestroMarkedDeliveredSource",
  },

  cancelled: {
    update: "CancelledUpdate",
    status: "CancelledStatus",
    subStatus: "CancelledSubStatus",
    remarks: "CancelledRemarks",
    userType: "CancelledUserType",
    userName: "CancelledUserName",
    source: "CancelledSource",
  },

  complaints: {
    update: "ComplaintsUpdate",
    status: "ComplaintsStatus",
    subStatus: "ComplaintsSubStatus",
    remarks: "ComplaintsRemarks",
    userType: "ComplaintsUserType",
    userName: "ComplaintsUserName",
    source: "ComplaintsSource",
  },
};

function getJourneyColumns(
  stage: string,
) {
  return JOURNEY_COLUMNS[
    normalizeKey(stage)
  ] || null;
}

/* =========================================================
   ORDER JOURNEY DIRECT UPSERT
========================================================= */

async function upsertOrderJourneyStage({
  supabase,
  order,
  stage,
  status,
  subStatus,
  remarks,
  userType,
  userName,
  source,
  actionAt,
  overwriteStage = true,
}: {
  supabase: any;
  order: any;
  stage: string;
  status: string;
  subStatus: string | null;
  remarks: string | null;
  userType: string;
  userName: string;
  source: string;
  actionAt: string;
  overwriteStage?: boolean;
}) {
  const orderId =
    cleanText(order?.OrderId);

  if (!orderId) {
    throw new Error(
      "OrderId missing while updating OrderJourney",
    );
  }

  const columns =
    getJourneyColumns(stage);

  if (!columns) {
    throw new Error(
      `Unsupported OrderJourney stage: ${stage}`,
    );
  }

  const {
    data: existingJourney,
    error: findError,
  } =
    await supabase
      .from("OrderJourney")
      .select("*")
      .eq("OrderId", orderId)
      .maybeSingle();

  if (findError) {
    throw findError;
  }

  const masterPayload: Record<string, any> = {
    OrderId: orderId,

    RestroCode:
      order?.RestroCode ??
      null,

    RestroName:
      cleanText(order?.RestroName),

    StationCode:
      cleanText(order?.StationCode),

    StationName:
      cleanText(order?.StationName),

    DeliveryDate:
      cleanText(order?.DeliveryDate),

    DeliveryTime:
      cleanText(order?.DeliveryTime),

    CurrentStage:
      stage,

    CurrentStatus:
      status,

    CurrentSubStatus:
      subStatus,

    LastRemarks:
      remarks,

    LastUserType:
      userType,

    LastUserName:
      userName,

    LastSource:
      source,

    LastUpdate:
      actionAt,

    UpdatedAt:
      actionAt,
  };

  const stageAlreadyCaptured =
    Boolean(
      existingJourney?.[columns.update],
    );

  if (
    !stageAlreadyCaptured ||
    overwriteStage
  ) {
    masterPayload[columns.update] =
      actionAt;

    masterPayload[columns.status] =
      status;

    masterPayload[columns.subStatus] =
      subStatus;

    masterPayload[columns.remarks] =
      remarks;

    masterPayload[columns.userType] =
      userType;

    masterPayload[columns.userName] =
      userName;

    masterPayload[columns.source] =
      source;
  }

  if (existingJourney) {
    const {
      data,
      error,
    } =
      await supabase
        .from("OrderJourney")
        .update(masterPayload)
        .eq("OrderId", orderId)
        .select("*")
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  const insertPayload = {
    ...masterPayload,
    CreatedAt:
      actionAt,
  };

  const {
    data,
    error,
  } =
    await supabase
      .from("OrderJourney")
      .insert(insertPayload)
      .select("*")
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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
    cleanText(order?.OrderId);

  if (!orderId) {
    return null;
  }

  const {
    data: existingJourney,
    error,
  } =
    await supabase
      .from("OrderJourney")
      .select(
        "OrderId, BookedUpdate",
      )
      .eq("OrderId", orderId)
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (
    existingJourney?.BookedUpdate
  ) {
    return existingJourney;
  }

  return upsertOrderJourneyStage({
    supabase,
    order,
    stage: "Booked",
    status: "Booked",
    subStatus: null,
    remarks:
      cleanText(order?.BookingRemarks) ||
      "Order created",
    userType: "Customer",
    userName:
      cleanText(order?.CustomerName) ||
      "Customer",
    source:
      getBookingSource(order),
    actionAt:
      getOrderCreatedAt(order),
    overwriteStage: false,
  });
}

/* =========================================================
   VALID STATUS TRANSITIONS
========================================================= */

function isActionAllowed(
  currentStatus: unknown,
  action: RestroAction,
) {
  const statusKey =
    normalizeKey(currentStatus);

  const allowed: Record<
    RestroAction,
    string[]
  > = {
    accept: [
      "neworder",
      "booked",
      "inverification",
    ],

    dispatch: [
      "inkitchen",
    ],

    delivered: [
      "outfordelivery",
    ],

    reject: [
      "neworder",
      "booked",
      "inverification",
      "inkitchen",
    ],

    outcome: [
      "outfordelivery",
      "restromarkeddelivered",
    ],

    complaintresponse: [
      "complaints",
      "complaint",
    ],
  };

  return allowed[action].includes(
    statusKey,
  );
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
            getRestroUserName(
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
   PATCH: RESTAURANT STATUS UPDATE
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
      await supabase
        .from("Orders")
        .select("*")
        .eq(
          "OrderId",
          orderId,
        )
        .eq(
          "RestroCode",
          restroCode,
        )
        .maybeSingle();

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

    if (
      !isActionAllowed(
        order.Status,
        action,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Action "${action}" is not allowed when order status is "${order.Status || "Unknown"}"`,
        },
        {
          status: 409,
        },
      );
    }

    const actionDefinition =
      ACTION_MAP[action];

    const restroUserName =
      getRestroUserName(
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

    const changedAt =
      new Date().toISOString();

    /*
     * Existing old orders ke liye missing Booked stage backfill.
     */
    const bookedJourney =
      await ensureBookedStage({
        supabase,
        order,
      });

    /*
     * Pehle Orders table update hogi.
     */
    const orderUpdatePayload: Record<
      string,
      any
    > = {
      Status:
        actionDefinition.status,

      SubStatus:
        subStatus,

      UpdatedAt:
        changedAt,
    };

    const {
      data: updatedOrder,
      error: updateError,
    } =
      await supabase
        .from("Orders")
        .update(orderUpdatePayload)
        .eq(
          "OrderId",
          orderId,
        )
        .eq(
          "RestroCode",
          restroCode,
        )
        .select("*")
        .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedOrder) {
      throw new Error(
        "Order status update failed",
      );
    }

    /*
     * Ab exact Restro actor OrderJourney me capture hoga.
     */
    const journey =
      await upsertOrderJourneyStage({
        supabase,
        order:
          updatedOrder,
        stage:
          actionDefinition.journeyStage,
        status:
          actionDefinition.status,
        subStatus,
        remarks,
        userType:
          "Restro",
        userName:
          restroUserName,
        source:
          "Restro Panel",
        actionAt:
          changedAt,
        overwriteStage:
          true,
      });

    return NextResponse.json({
      ok: true,

      row:
        updatedOrder,

      action,

      status:
        actionDefinition.status,

      subStatus,

      remarks,

      actor: {
        userType:
          "Restro",

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
        journey ??
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
