"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CANCEL_REASONS = [
  "Customer Plan Change",
  "Customer Call Not Connect",
  "Delivery Boy Missed",
  "Restro Closed",
  "Train Late",
  "Train Divert",
  "Item Issue",
  "Restro Refused without Reason",
  "Other",
  "Low & Order",
  "Natural Calamity",
];

const OUTCOME_OPTIONS = [
  "Partial Delivery",
  "Bad Delivery",
  "Customer Plan Change",
  "Customer Call Not Connect",
  "Customer Not on Seat",
  "Customer Refused Delivery",
  "Delivery Boy Missed",
  "Restro Closed",
  "Train Late",
  "Train Divert",
  "Item Issue",
  "Restro Refused without Reason",
  "Other",
  "Low & Order",
  "Natural Calamity",
];


function readStoredRestro() {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem("restro");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.log("RESTRO STORAGE READ FAILED", error);
    return null;
  }
}

function readStoredNewOrderCount() {
  if (typeof window === "undefined") return 0;

  try {
    return Number(window.localStorage.getItem("restro_new_orders") || 0);
  } catch {
    return 0;
  }
}

function writeStoredNewOrderCount(value: number) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem("restro_new_orders", String(value));
  } catch (error) {
    console.log("RESTRO NEW ORDER COUNT SAVE FAILED", error);
  }
}

function clearStoredNewOrderCount() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem("restro_new_orders");
  } catch (error) {
    console.log("RESTRO NEW ORDER COUNT CLEAR FAILED", error);
  }
}

function hasNotificationApi() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    typeof window.Notification !== "undefined"
  );
}

async function requestNotificationPermissionSafely() {
  if (!hasNotificationApi()) return;

  try {
    if (window.Notification.permission === "default") {
      await window.Notification.requestPermission();
    }
  } catch (error) {
    console.log("RESTRO NOTIFICATION PERMISSION SKIPPED", error);
  }
}

function showOrderNotification(title: string, body: string) {
  if (!hasNotificationApi()) return;

  try {
    if (window.Notification.permission === "granted") {
      new window.Notification(title, { body });
    }
  } catch (error) {
    console.log("RESTRO NOTIFICATION FAILED", error);
  }
}

const HARD_ORDER_VIBRATION_PATTERN = [
  1400, 180, 1400, 180, 1400, 180, 1400, 180,
  1400, 180, 1400, 180, 1400, 180,
];

function startHardOrderVibration(
  alertName: "BOOKED ORDER" | "NEW ORDER" | "IN VERIFICATION",
) {
  if (
    typeof window === "undefined" ||
    !("vibrate" in window.navigator)
  ) {
    console.log(`${alertName} VIBRATION NOT SUPPORTED`);
    return;
  }

  try {
    // Purana vibration pattern stop karke naya 10+ second pattern
    // turant start hota hai. Yeh audio/MP3 playback se independent hai.
    window.navigator.vibrate(0);
    const started = window.navigator.vibrate(
      HARD_ORDER_VIBRATION_PATTERN
    );

    console.log(
      started
        ? `${alertName} VIBRATION STARTED`
        : `${alertName} VIBRATION BLOCKED`
    );
  } catch (error) {
    console.log(`${alertName} VIBRATION FAILED`, error);
  }
}

function firstValue(source: any, keys: string[], fallback: any = null) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

function amount(value: any) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: any) {
  return `₹${amount(value).toFixed(2).replace(/\.00$/, "")}`;
}

function getOrderItems(order: any) {
  const rows = firstValue(order, ["MenuItems", "OrderItems", "items", "Items"], []);
  return Array.isArray(rows) ? rows : [];
}

function getItemSnapshot(item: any) {
  const quantity = Math.max(1, amount(firstValue(item, ["Quantity", "Qty", "quantity", "qty"], 1)));
  const unitPrice = amount(firstValue(item, ["UnitPrice", "ItemPrice", "SellingPrice", "Price", "unit_price", "item_price", "selling_price", "price"], 0));
  const lineTotal = amount(firstValue(item, ["LineTotal", "TotalPrice", "ItemTotal", "line_total", "total_price", "item_total"], unitPrice * quantity));

  return {
    name: String(firstValue(item, ["ItemName", "MenuItemName", "item_name", "name"], "Menu Item")),
    description: String(firstValue(item, ["ItemDescription", "Description", "item_description", "description"], "")),
    type: String(firstValue(item, ["MenuType", "ItemType", "FoodType", "menu_type", "item_type", "food_type"], "-")),
    quantity,
    unitPrice,
    lineTotal,
  };
}

function isOnlinePayment(order: any) {
  const mode = String(firstValue(order, ["PaymentMode", "paymentMode", "payment_mode"], "COD")).toLowerCase();
  return mode.includes("online") || mode.includes("prepaid") || mode === "ppd";
}

function escapePrintText(value: any) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function OrdersPage() {
  const router = useRouter();

  const [restro, setRestro] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("New Order");
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Status Modals Configuration Engine State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<"cancel" | "outcome" | "complaintresponse" | null>(null);
  const [subStatus, setSubStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Expandable Order Details Drawer State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<any>(null);

  const [newOrderCount, setNewOrderCount] = useState<number>(readStoredNewOrderCount);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bookedAudioRef = useRef<HTMLAudioElement | null>(null);
  const verificationReminderKeysRef = useRef<Set<string>>(new Set());
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  
  // टैब पेजिनेशन स्टेट (एक बार में सिर्फ 2 टैब दिखाने के लिए)
  const [tabSet, setTabSet] = useState(0);

  const restroTabs = [
    { label: "New Order", icon: "🔔" },
    { label: "In Kitchen", icon: "🍳" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Restro Marked Delivered", icon: "✅" },
    { label: "Complaints", icon: "⚠️" },
    { label: "Delivered", icon: "🏁" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "🚫" }
  ];

  const universalAdminTabs = [
    { label: "Booked", icon: "📘" },
    { label: "In Verification", icon: "🔎" },
    { label: "Cancellation Request", icon: "📝" },
    { label: "New Order", icon: "🔔" },
    { label: "In Kitchen", icon: "🍳" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Restro Mark Delivered", icon: "✅" },
    { label: "Complaints", icon: "⚠️" },
    { label: "Delivered", icon: "🏁" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "🚫" },
    { label: "Refund", icon: "↩️" },
    { label: "Bad Delivery", icon: "👎" },
    { label: "Partial Delivery", icon: "◐" },
    { label: "All", icon: "📋" },
  ];

  const isUniversalAdmin =
    restro?.Role === "UNIVERSAL_ADMIN";

  const allTabs =
    isUniversalAdmin
      ? universalAdminTabs
      : restroTabs;

  // अभी कौन से दो टैब दिखेंगे
  const visibleTabs = allTabs.slice(tabSet * 2, (tabSet * 2) + 2);

  useEffect(() => {
    loadData();
  }, []);

  /* ================= INIT SOUND ================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new window.Audio("/sounds/new-order.mp3");
    audio.preload = "auto";
    audio.volume = 1;
    audioRef.current = audio;

    const bookedAudio = new window.Audio("/sounds/booked-order.mp3");
    bookedAudio.preload = "auto";
    bookedAudio.volume = 1;
    bookedAudioRef.current = bookedAudio;

    const unlockAudio = async () => {
      try {
        const sounds = [
          audioRef.current,
          bookedAudioRef.current,
        ].filter(Boolean) as HTMLAudioElement[];

        for (const sound of sounds) {
          sound.muted = true;
          await sound.play();
          sound.pause();
          sound.currentTime = 0;
          sound.muted = false;
        }

        console.log("RESTRO AUDIO READY");
      } catch (e) {
        console.log("RESTRO AUDIO BLOCKED", e);
      }
    };

    document.addEventListener("click", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("scroll", unlockAudio, { once: true });

    requestNotificationPermissionSafely();

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("scroll", unlockAudio);
      audio.pause();
      bookedAudio.pause();
    };
  }, []);

  /* ================= REALTIME NEW ORDER ================= */
  useEffect(() => {
    if (!restro) return;

    const isUniversalAdmin =
      restro?.Role === "UNIVERSAL_ADMIN";

    if (
      !isUniversalAdmin &&
      !restro?.RestroCode
    ) {
      return;
    }

    const channel = supabase
      .channel("restro-live-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Orders",
        },
        async (payload) => {
          const newData: any = payload.new;

          if (!isUniversalAdmin) {
            return;
          }

          const status = String(newData.Status || "")
            .toLowerCase()
            .trim();

          if (status !== "booked") {
            return;
          }

          startHardOrderVibration("BOOKED ORDER");

          try {
            if (bookedAudioRef.current) {
              bookedAudioRef.current.pause();
              bookedAudioRef.current.currentTime = 0;
              bookedAudioRef.current.volume = 1;
              await bookedAudioRef.current.play();
            }
          } catch (error) {
            console.log("BOOKED ORDER SOUND FAILED", error);
          }

          showOrderNotification(
            "Booked RailEats Order",
            `${newData.OrderId || "New order"} - ${
              newData.CustomerName || "Customer"
            }`
          );

          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Orders",
        },
        async (payload) => {
          const newData: any = payload.new;

          if (
            !isUniversalAdmin &&
            Number(newData.RestroCode) !==
              Number(restro.RestroCode)
          ) {
            return;
          }

          const status = String(newData.Status || "")
            .toLowerCase()
            .trim();

          if (
            isUniversalAdmin &&
            status === "booked"
          ) {
            startHardOrderVibration("BOOKED ORDER");

            try {
              if (bookedAudioRef.current) {
                bookedAudioRef.current.pause();
                bookedAudioRef.current.currentTime = 0;
                bookedAudioRef.current.volume = 1;
                await bookedAudioRef.current.play();
              }
            } catch (error) {
              console.log("BOOKED ORDER SOUND FAILED", error);
            }

            showOrderNotification(
              "Booked RailEats Order",
              `${newData.OrderId || "New order"} - ${
                newData.CustomerName || "Customer"
              }`
            );

            loadData();
            return;
          }

          if (status !== "new order") {
            // Agar chalte web app par status change ho, toh view refresh ho jaye
            loadData();
            return;
          }

          console.log("RESTRO NEW ORDER:", payload);

          setNewOrderCount((prev) => {
            const updated = prev + 1;
            writeStoredNewOrderCount(updated);
            return updated;
          });

          startHardOrderVibration("NEW ORDER");

          try {
            if (audioRef.current) {
              console.log("PLAYING RESTRO SOUND");
              audioRef.current.pause();
              audioRef.current.currentTime = 0;
              audioRef.current.volume = 1;
              const playPromise = audioRef.current.play();

              if (playPromise) {
                playPromise
                  .then(() => {
                    console.log("RESTRO SOUND SUCCESS");
                  })
                  .catch((err) => {
                    console.log("RESTRO SOUND FAILED", err);
                  });
              }
            }
          } catch (e) {
            console.log("RESTRO AUDIO ERROR", e);
          }

          showOrderNotification(
            "New RailEats Order",
            `${newData.CustomerName || "Customer"} - ${newData.StationName || ""}`
          );

          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restro]);

  /* ================= AUTO REFRESH ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [restro]);

  /* ========== IN VERIFICATION: EVERY 5 MIN REMINDER ========== */
  useEffect(() => {
    if (
      restro?.Role !== "UNIVERSAL_ADMIN" ||
      typeof window === "undefined"
    ) {
      return;
    }

    const reminderEveryMs = 5 * 60 * 1000;

    const getVerificationStartedAt = (order: any) => {
      const direct = String(
        order?.InVerificationAt ??
          order?.InVerificationActionAt ??
          "",
      ).trim();

      if (direct) {
        const parsed = new Date(direct).getTime();
        if (Number.isFinite(parsed)) return parsed;
      }

      const date = String(
        order?.InVerificationActionAtDate ?? "",
      ).trim();
      const time = String(
        order?.InVerificationActionAtTime ?? "00:00:00",
      ).trim();

      if (!date) return null;

      const normalizedTime =
        /^\d{2}:\d{2}$/.test(time)
          ? `${time}:00`
          : time;
      const parsed = new Date(
        `${date}T${normalizedTime}`,
      ).getTime();

      return Number.isFinite(parsed)
        ? parsed
        : null;
    };

    const playDueReminders = () => {
      const now = Date.now();
      const dueOrders: any[] = [];
      const activeKeys = new Set<string>();

      for (const order of orders) {
        const status = String(order?.Status ?? "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (status !== "inverification") continue;

        const startedAt =
          getVerificationStartedAt(order);
        if (!startedAt || startedAt > now) continue;

        const completedIntervals = Math.floor(
          (now - startedAt) / reminderEveryMs,
        );

        if (completedIntervals < 1) continue;

        const orderId = String(
          order?.OrderId ?? order?.id ?? "unknown",
        );
        const reminderKey =
          `${orderId}:${startedAt}:${completedIntervals}`;

        activeKeys.add(reminderKey);

        if (
          !verificationReminderKeysRef.current.has(
            reminderKey,
          )
        ) {
          dueOrders.push(order);
          verificationReminderKeysRef.current.add(
            reminderKey,
          );
        }
      }

      // Purane status/bucket keys ko memory se hata dete hain.
      verificationReminderKeysRef.current =
        new Set(
          [...verificationReminderKeysRef.current].filter(
            (key) => activeKeys.has(key),
          ),
        );

      if (dueOrders.length === 0) return;

      startHardOrderVibration("IN VERIFICATION");

      try {
        if (bookedAudioRef.current) {
          bookedAudioRef.current.pause();
          bookedAudioRef.current.currentTime = 0;
          bookedAudioRef.current.volume = 1;
          void bookedAudioRef.current
            .play()
            .catch((error) => {
              console.log(
                "IN VERIFICATION SOUND FAILED",
                error,
              );
            });
        }
      } catch (error) {
        console.log(
          "IN VERIFICATION AUDIO ERROR",
          error,
        );
      }

      const firstOrderId =
        dueOrders[0]?.OrderId || "Order";

      showOrderNotification(
        "Order In Verification",
        dueOrders.length === 1
          ? `${firstOrderId} is still waiting for verification`
          : `${dueOrders.length} orders are still waiting for verification`,
      );
    };

    playDueReminders();
    const interval = window.setInterval(
      playDueReminders,
      1000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [orders, restro]);

  async function loadData() {
    try {
      setPageError("");

      const restroData = readStoredRestro();

      if (!restroData) {
        router.push("/");
        return;
      }

      setRestro(restroData);

      // Secure server API se restaurant ke orders load honge.
      // RestroCode client se trust nahi kiya jayega; server session se resolve karega.
      const response = await fetch("/api/restro/orders", {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        if (response.status === 401) {
          router.push("/");
          return;
        }

        throw new Error(result?.error || "Unable to load orders");
      }

      setOrders(Array.isArray(result.orders) ? result.orders : []);

      // Server session ki fresh restaurant identity local UI me merge karte hain.
      if (result?.restro) {
        const mergedRestro = {
          ...restroData,
          ...result.restro,
        };

        setRestro(mergedRestro);

        try {
          window.localStorage.setItem("restro", JSON.stringify(mergedRestro));
        } catch (storageError) {
          console.log("RESTRO STORAGE UPDATE SKIPPED", storageError);
        }
      }

      setLoading(false);
    } catch (err) {
      console.log(err);
      setPageError("Orders load nahi ho paaye. Internet check karke Retry karein.");
      setLoading(false);
    }
  }

  // Secure restaurant order marking through server API.
  async function handleUpdateStatus(
    order: any,
    action: "accept" | "dispatch" | "reject" | "delivered" | "outcome" | "complaintresponse" | "adminstatus",
    finalSubStatus = "",
    finalRemarks = "",
    targetStatus = "",
  ) {
    try {
      setSubmittingAction(true);

      const response = await fetch("/api/restro/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order?.OrderId,
          action,
          subStatus: finalSubStatus || null,
          remarks: String(finalRemarks || "").trim() || null,
          targetStatus: targetStatus || null,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to update order");
      }

      setActionModalOpen(false);
      setSelectedOrder(null);
      setActionType(null);
      setSubStatus("");
      setRemarks("");
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Failed to update order status. Please try again.");
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  }

  async function handleUniversalMove(
    order: any,
    targetStatus: string,
  ) {
    await handleUpdateStatus(
      order,
      "adminstatus",
      "",
      `Moved from ${order?.Status || "Unknown"} to ${targetStatus}`,
      targetStatus,
    );
  }

  const handleOpenActionModal = (order: any, type: typeof actionType) => {
    setSelectedOrder(order);
    setActionType(type);
    setRemarks("");
    if (type === "cancel") setSubStatus(CANCEL_REASONS[0]);
    if (type === "outcome" || type === "complaintresponse") {
      setSubStatus(OUTCOME_OPTIONS[0]);
    }
    setActionModalOpen(true);
  };

  const closeDetailsModal = () => {
    setDetailedOrder(null);
    setDetailsModalOpen(false);
  };

  const openActionFromDetails = (type: typeof actionType) => {
    if (!detailedOrder) return;
    closeDetailsModal();
    handleOpenActionModal(detailedOrder, type);
  };

  const printOrder = (order: any) => {
    if (typeof window === "undefined") return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to open the order slip.");
      return;
    }

    const escapeHtml = (value: any) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const safeText = (value: any, fallback = "N/A") => {
      const cleaned = String(value ?? "").trim();
      return escapeHtml(cleaned || fallback);
    };

    const items = getOrderItems(order).map(getItemSnapshot);
    const paymentMode = String(
      firstValue(order, ["PaymentMode", "paymentMode", "payment_mode"], "COD")
    );
    const orderTotal = amount(
      firstValue(order, ["TotalAmount", "OrderTotal", "totalAmount", "total_amount"], 0)
    );
    const collectAmount = isOnlinePayment(order)
      ? 0
      : amount(
          firstValue(
            order,
            ["CustomerToPay", "CODAmount", "PayableAmount", "TotalAmount"],
            orderTotal
          )
        );

    const itemRows = items.length
      ? items
          .map(
            (item, index) => `
              <tr>
                <td>
                  <div class="item-name">${index + 1}. ${safeText(item.name, "Item")}</div>
                  ${item.description ? `<div class="item-description">${safeText(item.description, "")}</div>` : ""}
                </td>
                <td class="center">${safeText(item.quantity, "0")}</td>
                <td class="right">${money(item.unitPrice)}</td>
                <td class="right strong">${money(item.lineTotal)}</td>
              </tr>`
          )
          .join("")
      : `<tr><td colspan="4" class="empty">Menu item details are not available for this order.</td></tr>`;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>RailEats Order ${safeText(order?.OrderId, "")}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px;
      background: rgba(255,255,255,.96);
      border-bottom: 1px solid #dbe1ea;
    }
    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 700;
      cursor: pointer;
    }
    .print-btn { background: #111827; color: white; }
    .close-btn { background: #e5e7eb; color: #111827; }
    .sheet {
      width: min(900px, calc(100% - 24px));
      margin: 18px auto 40px;
      background: white;
      border: 1px solid #dbe1ea;
      border-radius: 18px;
      box-shadow: 0 12px 34px rgba(15, 23, 42, .12);
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 24px;
      border-bottom: 2px solid #111827;
    }
    .brand { font-size: 28px; font-weight: 900; }
    .sub { margin-top: 4px; color: #6b7280; font-size: 13px; }
    .order-meta { text-align: right; }
    .order-id { color: #2f54eb; font-weight: 900; }
    .status { margin-top: 6px; font-size: 13px; }
    .section { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; }
    .section h2 { margin: 0 0 14px; font-size: 15px; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; }
    .label { color: #8a94a6; font-size: 10px; font-weight: 800; text-transform: uppercase; }
    .value { margin-top: 4px; font-size: 14px; font-weight: 700; overflow-wrap: anywhere; }
    .payment-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      padding: 10px 0;
      border-bottom: 1px dashed #dbe1ea;
      font-size: 13px;
    }
    .payment-row:last-child { border-bottom: 0; }
    .amount-box {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 16px;
      border-radius: 12px;
      background: #2f54eb;
      color: white;
      font-weight: 900;
      font-size: 17px;
    }
    .amount-box strong { font-size: 25px; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      color: #64748b;
      background: #f8fafc;
      font-size: 10px;
      text-transform: uppercase;
      padding: 10px;
      border-bottom: 1px solid #dbe1ea;
    }
    td { padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; vertical-align: top; }
    tr:last-child td { border-bottom: 0; }
    .item-name { font-weight: 800; }
    .item-description { margin-top: 4px; color: #64748b; font-size: 11px; }
    .center { text-align: center; }
    .right { text-align: right; }
    .strong { font-weight: 900; }
    .empty { text-align: center; color: #94a3b8; padding: 26px; }
    .footer { padding: 14px 24px; color: #94a3b8; font-size: 10px; text-align: center; }

    @media (max-width: 600px) {
      .sheet { width: 100%; margin: 0; border: 0; border-radius: 0; box-shadow: none; }
      .header { padding: 18px; flex-direction: column; }
      .order-meta { text-align: left; }
      .section { padding: 18px; }
      .details-grid { grid-template-columns: 1fr 1fr; gap: 14px 16px; }
      .toolbar { justify-content: stretch; }
      .toolbar button { flex: 1; }
      th, td { padding-left: 7px; padding-right: 7px; }
    }

    @media print {
      @page { size: A4; margin: 10mm; }
      body { background: white; }
      .toolbar { display: none !important; }
      .sheet {
        width: 100%;
        margin: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      .section, .header, table, tr, td, th { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
    <button class="close-btn" onclick="window.close()">✕ Close</button>
  </div>

  <main class="sheet">
    <header class="header">
      <div>
        <div class="brand">RailEats</div>
        <div class="sub">Restaurant Order Slip</div>
      </div>
      <div class="order-meta">
        <div class="order-id">#${safeText(order?.OrderId)}</div>
        <div class="status">Status: <strong>${safeText(order?.Status)}</strong></div>
      </div>
    </header>

    <section class="section">
      <h2>Journey & Customer Details</h2>
      <div class="details-grid">
        <div><div class="label">Customer Name</div><div class="value">${safeText(order?.CustomerName)}</div></div>
        <div><div class="label">Customer Mobile</div><div class="value">${safeText(order?.CustomerMobile)}</div></div>
        <div><div class="label">Train Number</div><div class="value">${safeText(order?.TrainNumber)}</div></div>
        <div><div class="label">Coach / Seat</div><div class="value">${safeText(order?.Coach)} / ${safeText(order?.Seat)}</div></div>
        <div><div class="label">Delivery Date</div><div class="value">${safeText(order?.DeliveryDate)}</div></div>
        <div><div class="label">Delivery Time</div><div class="value">${safeText(order?.DeliveryTime)}</div></div>
        <div><div class="label">Station Code</div><div class="value">${safeText(order?.StationCode)}</div></div>
        <div><div class="label">Station Name</div><div class="value">${safeText(order?.StationName)}</div></div>
      </div>
    </section>

    <section class="section">
      <h2>Payment Details</h2>
      <div class="payment-row"><span>Payment Mode</span><strong>${safeText(paymentMode)}</strong></div>
      <div class="payment-row"><span>Order Total</span><strong>${money(orderTotal)}</strong></div>
      <div class="amount-box"><span>Customer to Pay</span><strong>${money(collectAmount)}</strong></div>
    </section>

    <section class="section">
      <h2>Menu Items (${items.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Item & Description</th>
            <th class="center">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Line Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </section>

    <footer class="footer">Generated from RailEats Restaurant Panel</footer>
  </main>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleNextTabs = () => {
    if ((tabSet * 2) + 2 < allTabs.length) {
      setTabSet(tabSet + 1);
    } else {
      setTabSet(0); 
    }
  };

  const handlePrevTabs = () => {
    if (tabSet > 0) {
      setTabSet(tabSet - 1);
    } else {
      setTabSet(Math.floor((allTabs.length - 1) / 2)); 
    }
  };

  const handlePullStart = (e: TouchEvent<HTMLElement>) => {
    if (mainScrollRef.current?.scrollTop === 0) {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    }
  };

  const handlePullMove = (e: TouchEvent<HTMLElement>) => {
    if (touchStartYRef.current === null || isRefreshing) return;
    if ((mainScrollRef.current?.scrollTop || 0) > 0) {
      touchStartYRef.current = null;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0]?.clientY ?? 0;
    const distance = currentY - touchStartYRef.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, 96));
    }
  };

  const handlePullEnd = async () => {
    if (pullDistance >= 72 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(54);
      await loadData();
      setIsRefreshing(false);
    }

    touchStartYRef.current = null;
    setPullDistance(0);
  };

  const normalizeStatus = (value: any) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const orderMatchesTab = (item: any, tabLabel: string) => {
    if (tabLabel === "All") return true;

    const status = normalizeStatus(item?.Status);
    const subStatus = normalizeStatus(item?.SubStatus);
    const tab = normalizeStatus(tabLabel);

    if (tab === "restromarkdelivered") {
      return status === "restromarkeddelivered";
    }

    if (tab === "baddelivery" || tab === "partialdelivery") {
      return status === tab || subStatus === tab;
    }

    if (tab === "refund") {
      return (
        status === "refund" ||
        status.startsWith("refund") ||
        normalizeStatus(item?.RefundStatus).startsWith("refund")
      );
    }

    return status === tab;
  };

  const filteredOrders =
    orders.filter((item) =>
      orderMatchesTab(item, activeTab)
    );

  const tabCount = (label: string) =>
    orders.filter((item) =>
      orderMatchesTab(item, label)
    ).length;

  return (
    <div className="h-full w-full flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none overscroll-contain">
      

      {/* FIXED META & PACKED CONTROL TABS */}
      <div className="bg-white flex-shrink-0 pt-3 pb-3 border-b border-gray-100 z-40 w-full">
        {/* STATION META */}
        <div className="px-4 mb-3">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Orders</h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Station : <span className="text-[#2f54eb] font-extrabold">{restro?.StationCode || "N/A"}</span>
          </p>
        </div>

        {/* CONTROLS: EXACTLY TWO TABS AT A TIME */}
        <div className="flex items-center justify-between px-4 gap-2 w-full">
          <button 
            onClick={handlePrevTabs}
            className="w-8 h-9 bg-gray-50 border border-gray-200/70 active:bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-black flex-shrink-0 text-xs shadow-sm"
          >
            ❮
          </button>

          <div className="grid grid-cols-2 gap-2 flex-1 min-w-0">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.label;
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(tab.label)}
                  className={`w-full truncate text-ellipsis px-2 py-2 rounded-xl text-xs font-bold border transition-all duration-150 flex items-center justify-center gap-1.5 ${
                    isActive
                      ? "bg-[#2f54eb] text-white border-[#2f54eb] shadow-sm shadow-blue-100"
                      : "bg-gray-50 text-gray-600 border-gray-200/80 hover:bg-gray-100"
                  }`}
                >
                  <span className="flex-shrink-0">{tab.icon}</span>
                  <span className="truncate">{tab.label}</span>
                  {isUniversalAdmin && (
                    <span
                      className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-gray-500"
                      }`}
                    >
                      {tabCount(tab.label)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleNextTabs}
            className="w-8 h-9 bg-gray-50 border border-gray-200/70 active:bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-black flex-shrink-0 text-xs shadow-sm"
          >
            ❯
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE MIDDLE MAIN CONTENT VIEW */}
      <main
        ref={mainScrollRef}
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
        onTouchCancel={handlePullEnd}
        className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4 touch-action-pan-y"
      >
        {(pullDistance > 0 || isRefreshing) && (
          <div
            className="flex items-center justify-center text-[11px] font-black text-[#2f54eb] transition-all"
            style={{ height: `${Math.max(28, pullDistance)}px` }}
          >
            <span className={isRefreshing ? "animate-spin mr-2" : "mr-2"}>
              ⟳
            </span>
            {isRefreshing ? "Refreshing orders..." : pullDistance >= 72 ? "Release to refresh" : "Pull to refresh"}
          </div>
        )}

        {pageError ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-white rounded-3xl border border-red-100 p-6 shadow-sm flex flex-col items-center w-full">
              <span className="text-4xl mb-3">⚠️</span>
              <h3 className="text-base font-black text-gray-900">Orders nahi khul paaye</h3>
              <p className="text-xs text-gray-500 mt-1 font-medium max-w-[240px]">
                {pageError}
              </p>
              <button
                onClick={loadData}
                className="mt-4 bg-[#2f54eb] text-white text-xs font-black px-5 py-2.5 rounded-xl active:scale-[0.99]"
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2">
            <span className="text-2xl animate-spin">⏳</span>
            Fetching Fresh Orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col items-center w-full">
              <span className="text-5xl mb-3">🍱</span>
              <h3 className="text-base font-black text-gray-800">No Orders Present</h3>
              <p className="text-xs text-gray-400 mt-1 font-medium max-w-[220px]">
                Orders matching "{activeTab}" category are empty right now.
              </p>
            </div>
          </div>
        ) : (
          filteredOrders.map((item, index) => (
            <div 
              key={item.OrderId || index} 
              className="bg-white rounded-3xl border border-gray-100/80 p-4 shadow-sm flex flex-col gap-3.5 relative"
            >
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-[#2f54eb] font-extrabold text-[10px] px-2.5 py-1 rounded-lg tracking-wide">
                  #{item.OrderId}
                </span>
                <span className={`font-extrabold text-[10px] px-2.5 py-1 rounded-lg ${
                  item.Status === 'New Order' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {item.Status}
                </span>
              </div>

              {restro?.Role === "UNIVERSAL_ADMIN" && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-400">
                      Restaurant
                    </p>
                    <p className="truncate text-xs font-black text-blue-800">
                      {item.RestroName || "Restaurant"}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-black text-[#2f54eb] shadow-sm">
                    ID: {item.RestroCode || "N/A"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b border-dashed border-gray-100 pb-3">
                <div className="min-w-0">
                  <h4 className="font-black text-base text-gray-900 truncate max-w-[240px]">
                    {item.CustomerName}
                  </h4>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">
                    {item.CustomerMobile}
                  </p>
                </div>
                {item.CustomerMobile && (
                  <a 
                    href={`tel:${item.CustomerMobile}`} 
                    className="w-9 h-9 bg-blue-50 hover:bg-blue-100 rounded-full flex items-center justify-center transition flex-shrink-0"
                  >
                    <svg className="w-3.5 h-3.5 text-[#2f54eb]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-1C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">🚂</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Train</p>
                    <p className="font-black text-gray-800 text-xs mt-0.5">{item.TrainNumber}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">💺</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Coach/Seat</p>
                    <p className="font-black text-gray-800 text-xs mt-0.5">{item.Coach} / {item.Seat}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">📅</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</p>
                    <p className="font-black text-gray-800 text-xs mt-0.5">{item.DeliveryDate}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">🕒</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time</p>
                    <p className="font-black text-gray-800 text-xs mt-0.5">{item.DeliveryTime}</p>
                  </div>
                </div>
              </div>

              {/* DYNAMIC ORDER PROCESS MARKING CTAs FOR RESTRO */}
              <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  
                  {/* Left-side Category Info */}
                  <div className="flex items-center gap-1 text-[11px] font-bold text-gray-500 truncate min-w-0">
                    <span className="text-sm">🏪</span>
                    <span className="truncate max-w-[100px]">{item.RestroName}</span>
                  </div>

                  {/* Contextual Quick Actions Mapping */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isUniversalAdmin && activeTab === "Booked" && (
                      <button
                        disabled={submittingAction}
                        onClick={() => handleUniversalMove(item, "In Verification")}
                        className="bg-[#2f54eb] text-white font-black text-[11px] px-3 py-1.5 rounded-xl"
                      >
                        Verify
                      </button>
                    )}

                    {isUniversalAdmin && activeTab === "In Verification" && (
                      <>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "New Order")}
                          className="bg-green-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl"
                        >
                          Send to Restro
                        </button>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "Cancellation Request")}
                          className="bg-red-50 text-red-600 font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                        >
                          Cancel Request
                        </button>
                      </>
                    )}

                    {isUniversalAdmin && activeTab === "Cancellation Request" && (
                      <>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "Cancelled")}
                          className="bg-red-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl"
                        >
                          Cancel Order
                        </button>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "New Order")}
                          className="bg-green-50 text-green-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                        >
                          Continue
                        </button>
                      </>
                    )}
                    
                    {/* CASE 1: NEW ORDER TAB -> ACCEPT / REJECT BUTTONS */}
                    {activeTab === "New Order" && (
                      <>
                        <button 
                          disabled={submittingAction}
                          onClick={() => handleUpdateStatus(item, "accept")}
                          className="bg-green-600 hover:bg-green-700 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          Accept
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(item, "cancel")}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {/* CASE 2: IN KITCHEN TAB -> DISPATCH AS OUT FOR DELIVERY */}
                    {activeTab === "In Kitchen" && (
                      <>
                        <button 
                          disabled={submittingAction}
                          onClick={() => handleUpdateStatus(item, "dispatch")}
                          className="bg-[#2f54eb] hover:bg-blue-700 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          Dispatch 🛵
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(item, "cancel")}
                          className="text-gray-400 font-bold text-[11px] px-2 py-1.5"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {/* OUT FOR DELIVERY: delivered waits for customer confirmation; every issue becomes a complaint. */}
                    {activeTab === "Out for Delivery" && (
                      <>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUpdateStatus(item, "delivered")}
                          className="bg-green-600 hover:bg-green-700 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          Delivered ✅
                        </button>
                        <button
                          onClick={() => handleOpenActionModal(item, "outcome")}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                        >
                          Mark Status
                        </button>
                      </>
                    )}

                    {activeTab === "Complaints" && (
                      isUniversalAdmin ? (
                        <>
                          <button
                            disabled={submittingAction}
                            onClick={() => handleUniversalMove(item, "Delivered")}
                            className="bg-green-600 text-white font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                          >
                            Delivered
                          </button>
                          <button
                            disabled={submittingAction}
                            onClick={() => handleUniversalMove(item, "Not Delivered")}
                            className="bg-red-50 text-red-600 font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                          >
                            Not Delivered
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleOpenActionModal(item, "complaintresponse")}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                        >
                          Respond
                        </button>
                      )
                    )}

                    {isUniversalAdmin && activeTab === "Restro Mark Delivered" && (
                      <>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "Delivered")}
                          className="bg-green-600 text-white font-black text-[11px] px-3 py-1.5 rounded-xl"
                        >
                          Confirm Delivered
                        </button>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "Bad Delivery")}
                          className="bg-amber-50 text-amber-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                        >
                          Bad
                        </button>
                        <button
                          disabled={submittingAction}
                          onClick={() => handleUniversalMove(item, "Partial Delivery")}
                          className="bg-orange-50 text-orange-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl"
                        >
                          Partial
                        </button>
                      </>
                    )}

                    {/* View Details Default Button */}
                    <button 
                      onClick={() => { setDetailedOrder(item); setDetailsModalOpen(true); }}
                      className="bg-gray-50 hover:bg-gray-100 border border-gray-100 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-gray-700 transition"
                    >
                      Details
                    </button>

                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </main>


      {/* DYNAMIC ACTION SUB-STATUS SELECTION MODAL ENGINE */}
      {actionModalOpen && selectedOrder && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full rounded-t-[32px] p-6 max-w-md shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 capitalize">
                {actionType === "cancel"
                  ? "Reject Order"
                  : actionType === "complaintresponse"
                    ? "Respond to Complaint"
                    : "Mark Order Status"}
              </h3>
              <button 
                onClick={() => setActionModalOpen(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-black text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/40">
              <p className="text-xs font-bold text-gray-800">Order Reference: #{selectedOrder.OrderId}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{selectedOrder.CustomerName} • {selectedOrder.TrainNumber}</p>
            </div>

            {/* Sub-status Selection mapping logic */}
            {(actionType === "cancel" || actionType === "outcome" || actionType === "complaintresponse") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Select Primary Reason</label>
                <select 
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2f54eb]"
                >
                  {(actionType === "cancel" ? CANCEL_REASONS : OUTCOME_OPTIONS).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Description Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Internal Remarks / Comments</label>
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Type details for admin review..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#2f54eb] resize-none"
              />
            </div>

            {/* Trigger Button Execution */}
            <button
              disabled={submittingAction}
              onClick={() => {
                const action =
                  actionType === "cancel"
                    ? "reject"
                    : actionType === "complaintresponse"
                      ? "complaintresponse"
                      : "outcome";
                handleUpdateStatus(selectedOrder, action, subStatus, remarks);
              }}
              className="w-full bg-gray-900 text-white font-black text-xs py-3 rounded-xl shadow-md active:scale-[0.99] transition mt-2 disabled:bg-gray-400"
            >
              {submittingAction ? "Processing Update..." : "Confirm Status Change"}
            </button>
          </div>
        </div>
      )}

      {/* DETAILED VENDOR ORDER MODAL */}
      {detailsModalOpen && detailedOrder && typeof document !== "undefined" && createPortal((() => {
        const menuItems = getOrderItems(detailedOrder).map(getItemSnapshot);
        const onlinePayment = isOnlinePayment(detailedOrder);
        const paymentMode = String(firstValue(detailedOrder, ["PaymentMode", "paymentMode", "payment_mode"], "COD"));
        const basePrice = firstValue(detailedOrder, ["BasePrice", "Subtotal", "SubTotal", "basePrice", "subtotal"], 0);
        const gstAmount = firstValue(detailedOrder, ["GSTAmount", "GstAmount", "GST", "gstAmount", "gst_amount"], 0);
        const platformCharge = firstValue(detailedOrder, ["PlatformCharge", "platformCharge", "platform_charge"], 0);
        const deliveryCharge = firstValue(detailedOrder, ["DeliveryCharge", "deliveryCharge", "delivery_charge"], 0);
        const couponCode = firstValue(detailedOrder, ["CouponCode", "couponCode", "coupon_code"], "");
        const couponDiscount = firstValue(detailedOrder, ["CouponDiscount", "DiscountAmount", "couponDiscount", "coupon_discount"], 0);
        const orderTotal = firstValue(detailedOrder, ["TotalAmount", "OrderTotal", "totalAmount", "total_amount"], 0);
        const collectAmount = onlinePayment
          ? 0
          : firstValue(detailedOrder, ["CustomerToPay", "CODAmount", "PayableAmount", "TotalAmount"], orderTotal);
        const currentStatus = String(detailedOrder.Status || "").toLowerCase().trim();

        return (
          <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-6xl rounded-none sm:rounded-[24px] shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-gray-900">Order Details</h3>
                    <span className="bg-[#2f54eb] text-white rounded-md px-2 py-1 text-[10px] font-black break-all">
                      #{detailedOrder.OrderId}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 font-semibold mt-1">
                    Current Status: <span className="text-[#2f54eb] font-black">{detailedOrder.Status || "N/A"}</span>
                  </p>
                </div>
                <button onClick={closeDetailsModal} className="w-9 h-9 bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center text-sm font-black text-gray-500 flex-shrink-0">✕</button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,1fr)] gap-3 sm:gap-4 items-start">
                  {/* Mobile: Journey -> Payment -> Menu | Desktop: Journey + Menu left, Payment right */}
                  <section className="order-1 min-w-0 border border-gray-200 rounded-2xl overflow-hidden lg:col-start-1 lg:row-start-1">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-black text-gray-600 uppercase tracking-wide">🚆 Journey & Customer Details</div>
                    <div className="p-3 sm:p-4 grid grid-cols-2 gap-x-3 sm:gap-x-5 gap-y-4 text-xs">
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Customer Name</p><p className="mt-1 font-bold text-gray-900 break-words">{detailedOrder.CustomerName || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Customer Mobile</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.CustomerMobile || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Train Number</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.TrainNumber || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Coach / Seat</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.Coach || "N/A"} / {detailedOrder.Seat || "N/A"}</p></div>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3"><p className="text-[10px] text-gray-500 font-black uppercase">Delivery Date</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.DeliveryDate || "N/A"}</p></div>
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-3"><p className="text-[10px] text-gray-500 font-black uppercase">Delivery Time</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.DeliveryTime || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Station Code</p><p className="mt-1 font-bold text-gray-900">{detailedOrder.StationCode || "N/A"}</p></div>
                      <div><p className="text-[10px] text-gray-400 font-black uppercase">Station Name</p><p className="mt-1 font-bold text-gray-900 break-words">{detailedOrder.StationName || "N/A"}</p></div>
                      {detailedOrder.SubStatus && !["delivered", "restro marked delivered", "restromarkeddelivered"].includes(String(detailedOrder.SubStatus).toLowerCase().trim()) && (
                        <div className="col-span-2">
                          <p className="text-[10px] text-gray-400 font-black uppercase">Reason Tag</p>
                          <p className="mt-1 font-black text-red-500">{detailedOrder.SubStatus}</p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="order-2 min-w-0 border border-gray-200 rounded-2xl overflow-hidden lg:col-start-2 lg:row-start-1 lg:row-span-2">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-black text-[#2f54eb] uppercase tracking-wide">🛡 Payment Details</div>
                    <div className="p-4">
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 grid grid-cols-2 gap-3 mb-3">
                        <div><p className="text-[9px] text-gray-400 font-black uppercase">Payment Mode</p><span className="inline-block mt-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-black">{paymentMode}</span></div>
                        <div className="text-right"><p className="text-[9px] text-gray-400 font-black uppercase">Payment Status</p><p className={`mt-1 text-[11px] font-black ${onlinePayment ? "text-green-700" : "text-orange-600"}`}>{onlinePayment ? "Paid / Online" : "Collect on Delivery"}</p></div>
                      </div>
                      <div className="space-y-0 text-[11px]">
                        {[
                          ["Base Price / Subtotal", money(basePrice)],
                          ["GST Amount", money(gstAmount)],
                          ["Platform Charge", money(platformCharge)],
                          ["Delivery Charge", amount(deliveryCharge) ? money(deliveryCharge) : "N/A"],
                          ["Coupon Code / Discount", couponCode ? `${couponCode} / ${money(couponDiscount)}` : amount(couponDiscount) ? money(couponDiscount) : "Not Applied"],
                          ["Order Total", money(orderTotal)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3 py-2 border-b border-dashed border-gray-200"><span className="text-gray-500">{label}</span><strong className="text-gray-900 text-right">{value}</strong></div>
                        ))}
                      </div>
                      <div className="mt-3 bg-[#2f54eb] text-white rounded-xl px-4 py-3 flex items-center justify-between gap-3 min-w-0">
                        <span className="text-xs font-black leading-tight">Amount to Collect</span><strong className="text-xl sm:text-2xl font-black whitespace-nowrap">{money(collectAmount)}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="order-3 min-w-0 border border-gray-200 rounded-2xl overflow-hidden lg:col-start-1 lg:row-start-2">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-[11px] font-black text-gray-600 uppercase tracking-wide">▣ Menu Items ({menuItems.length})</div>
                    {menuItems.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold text-gray-400">Menu item details are not available for this order.</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {menuItems.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="p-3 sm:p-4 grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                            <div className="min-w-0">
                              <p className="font-black text-xs text-gray-900">{item.name}</p>
                              <p className="text-[10px] text-gray-500 mt-1">{item.description || "No item description available"}</p>
                              <p className="text-[10px] text-gray-400 mt-1">Type: {item.type}</p>
                            </div>
                            <div className="text-right text-[11px] min-w-[100px]">
                              <p className="text-gray-500">{money(item.unitPrice)} × <strong className="text-[#2f54eb]">{item.quantity}</strong></p>
                              <p className="font-black text-gray-900 mt-1">{money(item.lineTotal)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>

              </div>

              <div className="border-t border-gray-200 bg-white px-3 sm:px-4 py-3 grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end gap-2 flex-shrink-0">
                <button onClick={() => void printOrder(detailedOrder)} className="bg-gray-900 text-white px-3 sm:px-4 py-2.5 rounded-xl text-xs font-black">🖨 Print Order</button>
                {(currentStatus === "new order" || currentStatus === "neworder" || currentStatus === "booked" || currentStatus === "in verification") && (
                  <>
                    <button disabled={submittingAction} onClick={() => handleUpdateStatus(detailedOrder, "accept")} className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-black disabled:bg-gray-400">{submittingAction ? "Processing..." : "Accept Order"}</button>
                    <button onClick={() => openActionFromDetails("cancel")} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-black">Reject</button>
                  </>
                )}
                {currentStatus === "in kitchen" && (
                  <>
                    <button disabled={submittingAction} onClick={() => handleUpdateStatus(detailedOrder, "dispatch")} className="bg-[#2f54eb] text-white px-4 py-2.5 rounded-xl text-xs font-black disabled:bg-gray-400">Dispatch 🛵</button>
                    <button onClick={() => openActionFromDetails("cancel")} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl text-xs font-black">Cancel</button>
                  </>
                )}
                {currentStatus === "out for delivery" && (
                  <>
                    <button disabled={submittingAction} onClick={() => handleUpdateStatus(detailedOrder, "delivered")} className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-xs font-black disabled:bg-gray-400">Delivered ✅</button>
                    <button onClick={() => openActionFromDetails("outcome")} className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-black">Mark Status</button>
                  </>
                )}
                {(currentStatus === "complaints" || currentStatus === "complaint") && <button onClick={() => openActionFromDetails("complaintresponse")} className="bg-amber-50 text-amber-700 px-4 py-2.5 rounded-xl text-xs font-black">Respond</button>}
              </div>
            </div>
          </div>
        );
      })(), document.body)}

    </div>
  );
}
