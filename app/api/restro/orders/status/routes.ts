export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

function supabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) throw new Error("Supabase server environment variables are missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const clean = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");

function outcomeTarget(subStatus: string) {
  const normalized = key(subStatus);
  if (normalized === "partialdelivery") return { requestedStatus: "Partial Delivery", requestedSubStatus: "Partial Delivery" };
  if (normalized === "baddelivery") return { requestedStatus: "Bad Delivery", requestedSubStatus: "Bad Delivery" };
  return { requestedStatus: "Not Delivered", requestedSubStatus: subStatus };
}

async function history(supabase: any, payload: Record<string, any>) {
  const { error } = await supabase.from("OrderStatusHistory").insert(payload);
  if (error) console.error("RESTRO ORDER HISTORY ERROR", error);
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getRestroSession();
    if (!session) return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });

    const body = await req.json();
    const orderId = clean(body?.orderId);
    const action = key(body?.action);
    const subStatus = clean(body?.subStatus);
    const remarks = clean(body?.remarks);
    if (!orderId || !action) return NextResponse.json({ ok: false, error: "Order and action are required" }, { status: 400 });

    const supabase = supabaseServer();
    const { data: order, error: orderError } = await supabase
      .from("Orders")
      .select("*")
      .eq("OrderId", orderId)
      .eq("RestroCode", session.restroCode)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ ok: false, error: "Order not found for this restaurant" }, { status: 404 });

    const oldStatus = clean(order.Status);
    const now = new Date().toISOString();
    const actor = clean(order.RestroName) || `Restro ${session.restroCode}`;
    let newStatus = oldStatus;
    let newSubStatus: string | null = subStatus || null;
    let note = remarks;

    if (action === "accept") {
      if (key(oldStatus) !== "neworder") return NextResponse.json({ ok: false, error: "Only New Order can be accepted" }, { status: 409 });
      newStatus = "In Kitchen";
      newSubStatus = null;
      note = remarks || "Order accepted by restaurant";
    } else if (action === "dispatch") {
      if (key(oldStatus) !== "inkitchen") return NextResponse.json({ ok: false, error: "Only In Kitchen order can be dispatched" }, { status: 409 });
      newStatus = "Out for Delivery";
      newSubStatus = null;
      note = remarks || "Order dispatched by restaurant";
    } else if (action === "reject") {
      if (!subStatus) return NextResponse.json({ ok: false, error: "Reject reason is required" }, { status: 400 });
      newStatus = "Cancellation Request";
      note = remarks || `Restaurant requested cancellation: ${subStatus}`;
    } else if (action === "delivered") {
      if (key(oldStatus) !== "outfordelivery") return NextResponse.json({ ok: false, error: "Only Out for Delivery order can be marked delivered" }, { status: 409 });
      newStatus = "Restro Marked Delivered";
      newSubStatus = "Delivered";
      note = remarks || "Restaurant marked order delivered; awaiting customer confirmation";
    } else if (action === "outcome") {
      if (key(oldStatus) !== "outfordelivery") return NextResponse.json({ ok: false, error: "Outcome can be submitted only from Out for Delivery" }, { status: 409 });
      if (!subStatus) return NextResponse.json({ ok: false, error: "Outcome is required" }, { status: 400 });
      newStatus = "Complaints";
      const target = outcomeTarget(subStatus);
      note = remarks || `Restaurant reported: ${subStatus}`;

      const complaintPayload = {
        OrderId: orderId,
        RestroCode: session.restroCode,
        PreviousStatus: oldStatus,
        PreviousSubStatus: order.SubStatus ?? null,
        RequestedStatus: target.requestedStatus,
        RequestedSubStatus: target.requestedSubStatus,
        RaisedByType: "Restro",
        ComplaintRemarks: note,
        ComplaintStatus: "Pending",
        VendorStatus: target.requestedStatus,
        VendorSubStatus: target.requestedSubStatus,
        VendorRemarks: note,
        VendorRespondedAt: now,
        VendorRespondedBy: actor,
        UpdatedAt: now,
      };
      const { data: existing } = await supabase.from("OrderComplaints").select("ComplaintId,id").eq("OrderId", orderId).eq("ComplaintStatus", "Pending").order("CreatedAt", { ascending: false }).limit(1).maybeSingle();
      if (existing) {
        const idColumn = existing.ComplaintId ? "ComplaintId" : "id";
        const idValue = existing.ComplaintId ?? existing.id;
        const { error } = await supabase.from("OrderComplaints").update(complaintPayload).eq(idColumn, idValue);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("OrderComplaints").insert({ ...complaintPayload, CreatedAt: now });
        if (error) throw error;
      }
    } else if (action === "complaintresponse") {
      if (key(oldStatus) !== "complaints") return NextResponse.json({ ok: false, error: "This order is not in Complaints" }, { status: 409 });
      if (!subStatus) return NextResponse.json({ ok: false, error: "Response outcome is required" }, { status: 400 });
      newStatus = "Complaints";
      const target = outcomeTarget(subStatus);
      note = remarks || `Restaurant complaint response: ${subStatus}`;
      const { data: complaint } = await supabase.from("OrderComplaints").select("*").eq("OrderId", orderId).eq("ComplaintStatus", "Pending").order("CreatedAt", { ascending: false }).limit(1).maybeSingle();
      if (!complaint) return NextResponse.json({ ok: false, error: "Pending complaint not found" }, { status: 404 });
      const idColumn = complaint.ComplaintId ? "ComplaintId" : "id";
      const idValue = complaint.ComplaintId ?? complaint.id;
      const { error } = await supabase.from("OrderComplaints").update({
        VendorStatus: target.requestedStatus,
        VendorSubStatus: target.requestedSubStatus,
        VendorRemarks: note,
        VendorRespondedAt: now,
        VendorRespondedBy: actor,
        UpdatedAt: now,
      }).eq(idColumn, idValue);
      if (error) throw error;
    } else {
      return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      Status: newStatus,
      SubStatus: newSubStatus,
      UpdatedAt: now,
      RestroMarkedStatus: newStatus,
      RestroMarkedSubStatus: newSubStatus,
      RestroMarkedRemarks: note || null,
      RestroMarkedBy: actor,
      RestroMarkedAt: now,
    };
    if (newStatus === "Restro Marked Delivered") updatePayload.RestroMarkedDeliveredAt = now;

    const { error: updateError } = await supabase.from("Orders").update(updatePayload).eq("OrderId", orderId).eq("RestroCode", session.restroCode);
    if (updateError) throw updateError;

    await history(supabase, {
      OrderId: orderId,
      OldStatus: oldStatus || null,
      NewStatus: newStatus,
      SubStatus: newSubStatus,
      Remarks: note || null,
      Note: note || null,
      ChangedBy: actor,
      UserType: "Restro",
      UserName: actor,
      ActionSource: "Restro",
      ChangedAt: now,
    });

    return NextResponse.json({ ok: true, orderId, status: newStatus, subStatus: newSubStatus });
  } catch (error: any) {
    console.error("RESTRO ORDER STATUS ERROR", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unable to update order" }, { status: 500 });
  }
}
