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

async function getRestroActorName({
  supabase,
  session,
  order,
  restroCode,
}: {
  supabase: any;
  session: any;
  order: any;
  restroCode: number;
}) {
  const { data: restroRow, error } = await supabase
    .from("RestroMaster")
    .select("*")
    .eq("RestroCode", restroCode)
    .maybeSingle();

  if (error) {
    console.warn("RESTRO ACTOR NAME LOOKUP ERROR", error);
  }

  return (
    cleanText(session?.restroUserName) ||
    cleanText(session?.RestroUserName) ||
    cleanText(session?.userName) ||
    cleanText(session?.UserName) ||
    cleanText(session?.username) ||
    cleanText(session?.Username) ||
    cleanText(session?.name) ||
    cleanText(session?.Name) ||
    cleanText(restroRow?.RestroUserName) ||
    cleanText(restroRow?.RestroUsername) ||
    cleanText(restroRow?.UserName) ||
    cleanText(restroRow?.OwnerName) ||
    cleanText(restroRow?.RestroName) ||
    cleanText(order?.RestroName) ||
    `Restro ${restroCode}`
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

function getActionDateTime(actionAt: string) {
  const date = new Date(actionAt);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid action timestamp: ${actionAt}`);
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}:${values.second}`,
  };
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
  | "complaintresponse"
  | "adminstatus";

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

  adminstatus: {
    status: "Booked",
    journeyStage: "Booked",
    defaultRemarks: "Order status updated by Universal Admin",
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

    adminstatus: "adminstatus",
    adminmove: "adminstatus",
  };

  return aliases[key] || null;
}

/* =========================================================
   JOURNEY COLUMN MAPPING
========================================================= */

type JourneyColumns = {
  update: string;
  remarks: string;
  userType: string;
  userName: string;
  source: string;
  actionAtDate: string;
  actionAtTime: string;
};

const JOURNEY_COLUMNS: Record<string, JourneyColumns> = {
  booked: {
    update: "BookedUpdate",
    remarks: "BookedRemarks",
    userType: "BookedUserType",
    userName: "BookedUserName",
    source: "BookedSource",
    actionAtDate: "BookedActionAtDate",
    actionAtTime: "BookedActionAtTime",
  },

  inverification: {
    update: "InVerificationUpdate",
    remarks: "InVerificationRemarks",
    userType: "InVerificationUserType",
    userName: "InVerificationUserName",
    source: "InVerificationSource",
    actionAtDate: "InVerificationActionAtDate",
    actionAtTime: "InVerificationActionAtTime",
  },

  cancellationrequest: {
    update: "CancellationRequestUpdate",
    remarks: "CancellationRequestRemarks",
    userType: "CancellationRequestUserType",
    userName: "CancellationRequestUserName",
    source: "CancellationRequestSource",
    actionAtDate: "CancellationRequestActionAtDate",
    actionAtTime: "CancellationRequestActionAtTime",
  },

  neworder: {
    update: "NewOrderUpdate",
    remarks: "NewOrderRemarks",
    userType: "NewOrderUserType",
    userName: "NewOrderUserName",
    source: "NewOrderSource",
    actionAtDate: "NewOrderActionAtDate",
    actionAtTime: "NewOrderActionAtTime",
  },

  inkitchen: {
    update: "InKitchenUpdate",
    remarks: "InKitchenRemarks",
    userType: "InKitchenUserType",
    userName: "InKitchenUserName",
    source: "InKitchenSource",
    actionAtDate: "InKitchenActionAtDate",
    actionAtTime: "InKitchenActionAtTime",
  },

  outfordelivery: {
    update: "OutForDeliveryUpdate",
    remarks: "OutForDeliveryRemarks",
    userType: "OutForDeliveryUserType",
    userName: "OutForDeliveryUserName",
    source: "OutForDeliverySource",
    actionAtDate: "OutForDeliveryActionAtDate",
    actionAtTime: "OutForDeliveryActionAtTime",
  },

  restromarkeddelivered: {
    update: "RestroMarkedDeliveredUpdate",
    remarks: "RestroMarkedDeliveredRemarks",
    userType: "RestroMarkedDeliveredUserType",
    userName: "RestroMarkedDeliveredUserName",
    source: "RestroMarkedDeliveredSource",
    actionAtDate: "RestroMarkedDeliveredActionAtDate",
    actionAtTime: "RestroMarkedDeliveredActionAtTime",
  },

  cancelled: {
    update: "CancelledUpdate",
    remarks: "CancelledRemarks",
    userType: "CancelledUserType",
    userName: "CancelledUserName",
    source: "CancelledSource",
    actionAtDate: "CancelledActionAtDate",
    actionAtTime: "CancelledActionAtTime",
  },

  complaints: {
    update: "ComplaintsUpdate",
    remarks: "ComplaintsRemarks",
    userType: "ComplaintsUserType",
    userName: "ComplaintsUserName",
    source: "ComplaintsSource",
    actionAtDate: "ComplaintsActionAtDate",
    actionAtTime: "ComplaintsActionAtTime",
  },

  delivered: {
    update: "DeliveredUpdate",
    remarks: "DeliveredRemarks",
    userType: "DeliveredUserType",
    userName: "DeliveredUserName",
    source: "DeliveredSource",
    actionAtDate: "DeliveredActionAtDate",
    actionAtTime: "DeliveredActionAtTime",
  },

  notdelivered: {
    update: "NotDeliveredUpdate",
    remarks: "NotDeliveredRemarks",
    userType: "NotDeliveredUserType",
    userName: "NotDeliveredUserName",
    source: "NotDeliveredSource",
    actionAtDate: "NotDeliveredActionAtDate",
    actionAtTime: "NotDeliveredActionAtTime",
  },

  refund: {
    update: "RefundUpdate",
    remarks: "RefundRemarks",
    userType: "RefundUserType",
    userName: "RefundUserName",
    source: "RefundSource",
    actionAtDate: "RefundActionAtDate",
    actionAtTime: "RefundActionAtTime",
  },

  baddelivery: {
    update: "BadDeliveryUpdate",
    remarks: "BadDeliveryRemarks",
    userType: "BadDeliveryUserType",
    userName: "BadDeliveryUserName",
    source: "BadDeliverySource",
    actionAtDate: "BadDeliveryActionAtDate",
    actionAtTime: "BadDeliveryActionAtTime",
  },

  partialdelivery: {
    update: "PartialDeliveryUpdate",
    remarks: "PartialDeliveryRemarks",
    userType: "PartialDeliveryUserType",
    userName: "PartialDeliveryUserName",
    source: "PartialDeliverySource",
    actionAtDate: "PartialDeliveryActionAtDate",
    actionAtTime: "PartialDeliveryActionAtTime",
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

  const actionDateTime = getActionDateTime(actionAt);

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

    Status:
      status,

    SubStatus:
      subStatus,

    Remarks:
      remarks,

    DeliveryDate:
      cleanText(order?.DeliveryDate),

    DeliveryTime:
      cleanText(order?.DeliveryTime),
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

    masterPayload[columns.remarks] =
      remarks;

    masterPayload[columns.userType] =
      userType;

    masterPayload[columns.userName] =
      userName;

    masterPayload[columns.source] =
      source;

    masterPayload[columns.actionAtDate] =
      actionDateTime.date;

    masterPayload[columns.actionAtTime] =
      actionDateTime.time;
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

    adminstatus: [],
  };

  return allowed[action].includes(
    statusKey,
  );
}

/* =========================================================
   ORDER ITEMS HELPERS
========================================================= */

function getOrderIdFromRow(row: any) {
  return cleanText(
    row?.OrderId ??
      row?.orderId ??
      row?.order_id ??
      row?.OrderID,
  );
}

function getItemCodeFromRow(row: any) {
  return cleanText(
    row?.ItemCode ??
      row?.itemCode ??
      row?.item_code ??
      row?.MenuItemCode,
  );
}

function getItemNameFromRow(row: any) {
  return (
    cleanText(
      row?.ItemName ??
        row?.itemName ??
        row?.item_name ??
        row?.Name ??
        row?.name,
    ) || "Menu Item"
  );
}

function getItemDescriptionFromRow(row: any) {
  return cleanText(
    row?.ItemDescription ??
      row?.itemDescription ??
      row?.item_description ??
      row?.Description ??
      row?.description,
  );
}

function getItemQuantityFromRow(row: any) {
  const value =
    row?.Quantity ??
    row?.quantity ??
    row?.Qty ??
    row?.qty ??
    row?.ItemQty ??
    row?.item_qty ??
    1;

  const quantity = Number(value);

  return Number.isFinite(quantity) && quantity > 0
    ? quantity
    : 1;
}

function getItemUnitPriceFromRow(row: any) {
  const value =
    row?.UnitPrice ??
    row?.unitPrice ??
    row?.unit_price ??
    row?.Price ??
    row?.price ??
    row?.SellingPrice ??
    row?.sellingPrice ??
    row?.selling_price ??
    row?.ItemPrice ??
    row?.item_price ??
    0;

  const price = Number(value);

  return Number.isFinite(price)
    ? price
    : 0;
}

function getItemLineTotalFromRow(row: any) {
  const directValue =
    row?.LineTotal ??
    row?.lineTotal ??
    row?.line_total ??
    row?.TotalPrice ??
    row?.totalPrice ??
    row?.total_price ??
    row?.ItemTotal ??
    row?.item_total ??
    row?.TotalAmount ??
    row?.totalAmount;

  const directTotal = Number(directValue);

  if (Number.isFinite(directTotal)) {
    return directTotal;
  }

  return (
    getItemQuantityFromRow(row) *
    getItemUnitPriceFromRow(row)
  );
}

function normalizeOrderItem(
  row: any,
  menuRow?: any,
) {
  const description =
    getItemDescriptionFromRow(row) ||
    getItemDescriptionFromRow(menuRow);

  const itemName =
    getItemNameFromRow(row) ||
    getItemNameFromRow(menuRow);

  const quantity =
    getItemQuantityFromRow(row);

  const unitPrice =
    getItemUnitPriceFromRow(row);

  const lineTotal =
    getItemLineTotalFromRow(row);

  /*
   * Original DB columns preserve kiye gaye hain aur saath me common
   * aliases attach kiye gaye hain. Isse current frontend aur future
   * frontend dono bina kisi breaking change ke items read kar sakte hain.
   */
  return {
    ...row,

    OrderId:
      getOrderIdFromRow(row),

    ItemCode:
      getItemCodeFromRow(row) ||
      getItemCodeFromRow(menuRow),

    ItemName:
      itemName,

    ItemDescription:
      description,

    Quantity:
      quantity,

    UnitPrice:
      unitPrice,

    LineTotal:
      lineTotal,

    TotalPrice:
      lineTotal,

    MenuType:
      cleanText(
        row?.MenuType ??
          row?.menuType ??
          row?.menu_type ??
          menuRow?.MenuType ??
          menuRow?.menuType ??
          menuRow?.menu_type,
      ),

    ItemCategory:
      cleanText(
        row?.ItemCategory ??
          row?.itemCategory ??
          row?.item_category ??
          menuRow?.ItemCategory ??
          menuRow?.itemCategory ??
          menuRow?.item_category,
      ),
  };
}

function chunkArray<T>(
  values: T[],
  size = 200,
) {
  const chunks: T[][] = [];

  for (
    let index = 0;
    index < values.length;
    index += size
  ) {
    chunks.push(
      values.slice(
        index,
        index + size,
      ),
    );
  }

  return chunks;
}

async function getOrderItemsForOrders({
  supabase,
  orders,
  restroCode,
}: {
  supabase: any;
  orders: any[];
  restroCode: number | null;
}) {
  const orderIds = Array.from(
    new Set(
      orders
        .map((order) =>
          cleanText(order?.OrderId),
        )
        .filter(
          (value): value is string =>
            Boolean(value),
        ),
    ),
  );

  if (orderIds.length === 0) {
    return new Map<string, any[]>();
  }

  const rawItems: any[] = [];

  /*
   * Supabase/PostgREST query length safe rakhne ke liye Order IDs chunks
   * me fetch kiye ja rahe hain.
   */
  for (
    const orderIdChunk of chunkArray(
      orderIds,
      200,
    )
  ) {
    const {
      data: itemRows,
      error: itemError,
    } =
      await supabase
        .from("OrderItems")
        .select("*")
        .in(
          "OrderId",
          orderIdChunk,
        );

    if (itemError) {
      throw itemError;
    }

    rawItems.push(
      ...(itemRows || []),
    );
  }

  /*
   * OrderItems me description blank ho sakti hai. Available ItemCode ke
   * basis par RestroMenuItems se description/category/menu type enrich
   * karte hain. Agar table lookup fail ho to orders API ko fail nahi
   * karenge; original OrderItems fir bhi return honge.
   */
  const itemCodes = Array.from(
    new Set(
      rawItems
        .map(getItemCodeFromRow)
        .filter(
          (value): value is string =>
            Boolean(value),
        ),
    ),
  );

  const menuByCode =
    new Map<string, any>();

  if (itemCodes.length > 0 && restroCode) {
    try {
      for (
        const itemCodeChunk of chunkArray(
          itemCodes,
          200,
        )
      ) {
        const {
          data: menuRows,
          error: menuError,
        } =
          await supabase
            .from("RestroMenuItems")
            .select("*")
            .eq(
              "restro_code",
              String(restroCode),
            )
            .in(
              "item_code",
              itemCodeChunk,
            );

        if (menuError) {
          console.warn(
            "RESTRO MENU ITEM ENRICHMENT SKIPPED",
            menuError,
          );
          break;
        }

        for (
          const menuRow of menuRows || []
        ) {
          const code =
            getItemCodeFromRow(menuRow);

          if (code) {
            menuByCode.set(
              code,
              menuRow,
            );
          }
        }
      }
    } catch (menuLookupError) {
      console.warn(
        "RESTRO MENU ITEM ENRICHMENT ERROR",
        menuLookupError,
      );
    }
  }

  const itemsByOrderId =
    new Map<string, any[]>();

  for (const rawItem of rawItems) {
    const orderId =
      getOrderIdFromRow(rawItem);

    if (!orderId) {
      continue;
    }

    const itemCode =
      getItemCodeFromRow(rawItem);

    const normalizedItem =
      normalizeOrderItem(
        rawItem,
        itemCode
          ? menuByCode.get(itemCode)
          : null,
      );

    const currentItems =
      itemsByOrderId.get(orderId) ||
      [];

    currentItems.push(
      normalizedItem,
    );

    itemsByOrderId.set(
      orderId,
      currentItems,
    );
  }

  return itemsByOrderId;
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

    const isUniversalAdmin =
      session.role === "UNIVERSAL_ADMIN";

    const restroCode =
      getSessionRestroCode(session);

    if (!isUniversalAdmin && !restroCode) {
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

    let ordersQuery =
      supabase
        .from("Orders")
        .select("*")
        .order("CreatedAt", {
          ascending: false,
        });

    if (!isUniversalAdmin) {
      ordersQuery =
        ordersQuery.eq(
          "RestroCode",
          restroCode,
        );
    }

    const {
      data,
      error,
    } = await ordersQuery;

    if (error) {
      throw error;
    }

    const baseOrders =
      data || [];

    const itemsByOrderId =
      await getOrderItemsForOrders({
        supabase,
        orders: baseOrders,
        restroCode:
          isUniversalAdmin
            ? null
            : restroCode,
      });

    const orders =
      baseOrders.map((order) => {
        const orderId =
          cleanText(order?.OrderId);

        const menuItems =
          (
            orderId
              ? itemsByOrderId.get(
                  orderId,
                )
              : null
          ) || [];

        /*
         * MenuItems aur OrderItems dono aliases diye gaye hain taaki current
         * page.tsx jis naam se array read kare, items correctly show hon.
         */
        return {
          ...order,

          MenuItems:
            menuItems,

          OrderItems:
            menuItems,

          items:
            menuItems,

          MenuItemCount:
            menuItems.length,

          TotalItemQuantity:
            menuItems.reduce(
              (
                total: number,
                item: any,
              ) =>
                total +
                getItemQuantityFromRow(
                  item,
                ),
              0,
            ),
        };
      });

    const firstOrder =
      orders[0] || null;

    return NextResponse.json(
      {
        ok: true,
        orders,
        restro: {
          RestroCode:
            isUniversalAdmin
              ? null
              : restroCode,

          RestroName:
            isUniversalAdmin
              ? "Railway Eats Admin"
              : getRestroUserName(
                  session,
                  firstOrder,
                ),

          StationCode:
            isUniversalAdmin
              ? "ALL"
              : cleanText(
                  firstOrder?.StationCode,
                ),

          StationName:
            isUniversalAdmin
              ? "All India"
              : cleanText(
                  firstOrder?.StationName,
                ),

          Role:
            session.role,
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

async function handleRestroStatusUpdate(
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

    const isUniversalAdmin =
      session.role === "UNIVERSAL_ADMIN";

    const sessionRestroCode =
      getSessionRestroCode(session);

    if (
      !isUniversalAdmin &&
      !sessionRestroCode
    ) {
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

    const requestedStatus =
      cleanText(
        body?.targetStatus ??
          body?.TargetStatus,
      );

    const universalAdminStatuses =
      new Set([
        "Booked",
        "In Verification",
        "Cancellation Request",
        "New Order",
        "In Kitchen",
        "Out for Delivery",
        "Restro Marked Delivered",
        "Complaints",
        "Delivered",
        "Cancelled",
        "Not Delivered",
        "Refund",
        "Bad Delivery",
        "Partial Delivery",
      ]);

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
      action === "adminstatus" &&
      (
        !isUniversalAdmin ||
        !requestedStatus ||
        !universalAdminStatuses.has(
          requestedStatus,
        )
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid Universal Admin status action",
        },
        {
          status: 403,
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

    let orderQuery =
      supabase
        .from("Orders")
        .select("*")
        .eq(
          "OrderId",
          orderId,
        );

    if (!isUniversalAdmin) {
      orderQuery =
        orderQuery.eq(
          "RestroCode",
          sessionRestroCode,
        );
    }

    const {
      data: order,
      error: orderError,
    } = await orderQuery.maybeSingle();

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

    const restroCode =
      normalizeRestroCode(
        order?.RestroCode,
      );

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Order restaurant is not configured correctly",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * HARD LOCK:
     * Agar order RestroRDS me already mark ho chuka hai to Restaurant panel
     * se us order ka koi bhi status/action dobara change nahi hoga.
     */
    const {
      data: existingRdsRow,
      error: rdsLockError,
    } = await supabase
      .from("RestroRDS")
      .select("RDSId, OrderId, Status, SubStatus")
      .eq("OrderId", orderId)
      .maybeSingle();

    if (rdsLockError) {
      throw rdsLockError;
    }

    if (existingRdsRow) {
      return NextResponse.json(
        {
          ok: false,
          locked: true,
          error:
            "Unable to change order. Order already marked in RestroRDS.",
          orderId,
          rdsId:
            existingRdsRow.RDSId,
        },
        {
          status: 409,
        },
      );
    }

    if (
      action !== "adminstatus" &&
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
      action === "adminstatus"
        ? {
            status:
              requestedStatus!,
            journeyStage:
              requestedStatus!,
            defaultRemarks:
              `Order moved to ${requestedStatus} by Universal Admin`,
          }
        : ACTION_MAP[action];

    const restroUserName =
      await getRestroActorName({
        supabase,
        session,
        order,
        restroCode,
      });

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

    /*
     * Restaurant ke Delivered action par Orders table me dedicated
     * RestroMarked* audit columns bhi fill honge.
     */
    if (action === "delivered") {
      orderUpdatePayload.RestroMarkedDeliveredAt =
        changedAt;

      orderUpdatePayload.RestroMarkedStatus =
        actionDefinition.status;

      orderUpdatePayload.RestroMarkedSubStatus =
        subStatus;

      orderUpdatePayload.RestroMarkedRemarks =
        remarks;

      orderUpdatePayload.RestroMarkedBy =
        restroUserName;

      orderUpdatePayload.RestroMarkedAt =
        changedAt;
    }

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
          isUniversalAdmin
            ? "Admin"
            : "Restro",
        userName:
          restroUserName,
        source:
          isUniversalAdmin
            ? "Universal Admin Panel"
            : "Restro Panel",
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
          isUniversalAdmin
            ? "Admin"
            : "Restro",

        userName:
          restroUserName,

        source:
          isUniversalAdmin
            ? "Universal Admin Panel"
            : "Restro Panel",

        restroCode,
      },

      bookedJourney:
        bookedJourney ??
        null,

      journey:
        journey ??
        null,

      restroMarkedDelivered:
        action === "delivered",

      restroMarkedAudit:
        action === "delivered"
          ? {
              RestroMarkedDeliveredAt:
                updatedOrder?.RestroMarkedDeliveredAt ??
                changedAt,

              RestroMarkedStatus:
                updatedOrder?.RestroMarkedStatus ??
                actionDefinition.status,

              RestroMarkedSubStatus:
                updatedOrder?.RestroMarkedSubStatus ??
                subStatus,

              RestroMarkedRemarks:
                updatedOrder?.RestroMarkedRemarks ??
                remarks,

              RestroMarkedBy:
                updatedOrder?.RestroMarkedBy ??
                restroUserName,

              RestroMarkedAt:
                updatedOrder?.RestroMarkedAt ??
                changedAt,
            }
          : null,
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

export async function PATCH(
  req: NextRequest,
) {
  return handleRestroStatusUpdate(req);
}

export async function POST(
  req: NextRequest,
) {
  return handleRestroStatusUpdate(req);
}
