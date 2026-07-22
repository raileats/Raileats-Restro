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
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  
  // टैब पेजिनेशन स्टेट (एक बार में सिर्फ 2 टैब दिखाने के लिए)
  const [tabSet, setTabSet] = useState(0);

  const allTabs = [
    { label: "New Order", icon: "🔔" },
    { label: "In Kitchen", icon: "🍳" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Restro Marked Delivered", icon: "✅" },
    { label: "Complaints", icon: "⚠️" },
    { label: "Delivered", icon: "🏁" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "🚫" }
  ];

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

    const unlockAudio = async () => {
      try {
        if (!audioRef.current) return;
        audioRef.current.muted = true;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
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
    };
  }, []);

  /* ================= REALTIME NEW ORDER ================= */
  useEffect(() => {
    if (!restro?.RestroCode) return;

    const channel = supabase
      .channel("restro-live-orders")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "Orders",
        },
        async (payload) => {
          const newData: any = payload.new;

          if (Number(newData.RestroCode) !== Number(restro.RestroCode)) {
            return;
          }

          const status = String(newData.Status || "")
            .toLowerCase()
            .trim();

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
    action: "accept" | "dispatch" | "reject" | "delivered" | "outcome" | "complaintresponse",
    finalSubStatus = "",
    finalRemarks = "",
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

  const printOrder = async (order: any) => {
    if (typeof window === "undefined") return;

    // Open the tab immediately so mobile browsers do not block it after await.
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      alert("Please allow pop-ups to open the order PDF.");
      return;
    }

    pdfWindow.document.write(`<!doctype html><html><head><title>Preparing Order PDF</title></head><body style="font-family:Arial,sans-serif;padding:24px">Preparing order PDF...</body></html>`);
    pdfWindow.document.close();

    try {
      const { jsPDF } = await import("jspdf");

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

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const left = 14;
      const right = pageWidth - 14;
      const contentWidth = right - left;
      let y = 16;

      const safe = (value: any, fallback = "N/A") => {
        const cleaned = String(value ?? "").trim();
        return cleaned || fallback;
      };

      const addLabelValue = (label: string, value: any, x: number, rowY: number) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(110, 118, 130);
        doc.text(label.toUpperCase(), x, rowY);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(20, 24, 35);
        doc.text(safe(value), x, rowY + 5, { maxWidth: contentWidth / 2 - 8 });
      };

      const ensureSpace = (requiredHeight: number) => {
        if (y + requiredHeight <= pageHeight - 14) return;
        doc.addPage();
        y = 16;
      };

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(20, 24, 35);
      doc.text("RailEats", left, y);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 108, 120);
      doc.text("Restaurant Order PDF", left, y + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(47, 84, 235);
      doc.text(safe(order?.OrderId), right, y, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 98, 110);
      doc.text(`Status: ${safe(order?.Status)}`, right, y + 6, { align: "right" });

      y += 13;
      doc.setDrawColor(35, 40, 50);
      doc.setLineWidth(0.5);
      doc.line(left, y, right, y);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 35, 45);
      doc.text("Journey & Customer Details", left, y);
      y += 8;

      const columnGap = 8;
      const columnWidth = (contentWidth - columnGap) / 2;
      const rightColumnX = left + columnWidth + columnGap;

      addLabelValue("Customer Name", order?.CustomerName, left, y);
      addLabelValue("Customer Mobile", order?.CustomerMobile, rightColumnX, y);
      y += 16;
      addLabelValue("Train Number", order?.TrainNumber, left, y);
      addLabelValue(
        "Coach / Seat",
        `${safe(order?.Coach)} / ${safe(order?.Seat)}`,
        rightColumnX,
        y
      );
      y += 16;
      addLabelValue("Delivery Date", order?.DeliveryDate, left, y);
      addLabelValue("Delivery Time", order?.DeliveryTime, rightColumnX, y);
      y += 16;
      addLabelValue("Station Code", order?.StationCode, left, y);
      addLabelValue("Station Name", order?.StationName, rightColumnX, y);
      y += 16;

      ensureSpace(34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 35, 45);
      doc.text("Payment Details", left, y);
      y += 7;

      const paymentRows: Array<[string, string]> = [
        ["Payment Mode", paymentMode],
        ["Order Total", money(orderTotal)],
        ["Customer to Pay", money(collectAmount)],
      ];

      paymentRows.forEach(([label, value]) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(95, 103, 115);
        doc.text(label, left, y);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 24, 35);
        doc.text(value, right, y, { align: "right" });
        doc.setDrawColor(220, 224, 230);
        doc.setLineWidth(0.2);
        doc.line(left, y + 2.5, right, y + 2.5);
        y += 8;
      });

      y += 4;
      ensureSpace(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 35, 45);
      doc.text(`Menu Items (${items.length})`, left, y);
      y += 8;

      if (items.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(120, 128, 140);
        doc.text("Menu item details are not available for this order.", left, y);
        y += 10;
      } else {
        items.forEach((item, index) => {
          const description = safe(item.description, "");
          const itemNameLines = doc.splitTextToSize(
            `${index + 1}. ${safe(item.name, "Item")}`,
            contentWidth - 62
          );
          const descriptionLines = description
            ? doc.splitTextToSize(description, contentWidth - 62)
            : [];
          const rowHeight = Math.max(
            13,
            itemNameLines.length * 5 + descriptionLines.length * 4 + 4
          );

          ensureSpace(rowHeight + 3);

          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(25, 30, 40);
          doc.text(itemNameLines, left, y);

          if (descriptionLines.length) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(110, 118, 130);
            doc.text(descriptionLines, left, y + itemNameLines.length * 5);
          }

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(70, 78, 90);
          doc.text(`${money(item.unitPrice)} x ${item.quantity}`, right - 26, y, {
            align: "right",
          });

          doc.setFont("helvetica", "bold");
          doc.setTextColor(20, 24, 35);
          doc.text(money(item.lineTotal), right, y, { align: "right" });

          doc.setDrawColor(225, 228, 234);
          doc.setLineWidth(0.2);
          doc.line(left, y + rowHeight - 2, right, y + rowHeight - 2);
          y += rowHeight;
        });
      }

      ensureSpace(20);
      y += 3;
      doc.setFillColor(47, 84, 235);
      doc.roundedRect(left, y, contentWidth, 14, 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("Amount to Collect", left + 5, y + 9);
      doc.setFontSize(15);
      doc.text(money(collectAmount), right - 5, y + 9, { align: "right" });

      const totalPages = doc.getNumberOfPages();
      for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(135, 142, 153);
        doc.text(
          `RailEats Restaurant Panel  |  Page ${page} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 7,
          { align: "center" }
        );
      }

      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      pdfWindow.location.replace(pdfUrl);

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 5 * 60 * 1000);
    } catch (error) {
      console.error("ORDER PDF GENERATION FAILED", error);
      pdfWindow.close();
      alert("Order PDF generate nahi ho paayi. Please try again.");
    }
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

  const filteredOrders = orders.filter((item) => {
    const status = item.Status?.toLowerCase().trim();
    if (
      activeTab === "New Order" &&
      (status === "new order" || status === "neworder")
    ) {
      return true;
    }
    if (activeTab === "In Kitchen" && status === "in kitchen") {
      return true;
    }
    if (activeTab === "Out for Delivery" && status === "out for delivery") {
      return true;
    }
    if (
      activeTab === "Restro Marked Delivered" &&
      (status === "restro marked delivered" || status === "restromarkeddelivered")
    ) {
      return true;
    }
    if (activeTab === "Complaints" && (status === "complaints" || status === "complaint")) {
      return true;
    }
    if (activeTab === "Delivered" && status === "delivered") {
      return true;
    }
    if (activeTab === "Cancelled" && status === "cancelled") {
      return true;
    }
    if (activeTab === "Not Delivered" && status === "not delivered") {
      return true;
    }
    return false;
  });

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
                      <button
                        onClick={() => handleOpenActionModal(item, "complaintresponse")}
                        className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                      >
                        Respond
                      </button>
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
