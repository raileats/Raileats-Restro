"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CANCEL_REASONS = [
  "Restro Closed",
  "Item Issue",
  "Restro Refused without Reason",
  "Other"
];

const NOT_DELIVERED_REASONS = [
  "Restro Missed",
  "Late Processing",
  "Technical Issue"
];

export default function OrdersPage() {
  const router = useRouter();
  const [restro, setRestro] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("New Order");
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Status Modals Configuration Engine State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<"cancel" | "notdelivered" | "baddelivery" | null>(null);
  const [subStatus, setSubStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Expandable Order Details Drawer State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<any>(null);

  const [newOrderCount, setNewOrderCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("restro_new_orders") || 0);
    }
    return 0;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tabSet, setTabSet] = useState(0);

  const allTabs = [
    { label: "New Order", icon: "🔔" },
    { label: "In Kitchen", icon: "🍳" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Delivered", icon: "✅" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "⚠️" },
    { label: "Bad Delivery", icon: "🚨" }
  ];

  const visibleTabs = allTabs.slice(tabSet * 2, tabSet * 2 + 2);

  /* ================= AUDIO PARAMETERS & UNLOCKING SYSTEM ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/order_announcement.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1.0;

    const unlockAudio = async () => {
      try {
        if (audioRef.current) {
          audioRef.current.muted = true;
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.muted = false;
        }
      } catch (e) {
        console.log("Audio unlock system interaction delayed by browser engine policies");
      }
    };

    document.body.addEventListener("click", unlockAudio, { once: true });
    return () => {
      document.body.removeEventListener("click", unlockAudio);
    };
  }, []);

  /* ================= LOCAL STORAGE SAFE INTEGRATION IN RESTAURANT SECTOR ================= */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("current_restro");
      if (!stored) {
        router.push("/login");
        return;
      }
      setRestro(JSON.parse(stored));
    }
  }, [router]);

  /* ================= NOTIFICATION AND INTENT CONTROL LOGIC ================= */
  useEffect(() => {
    if (activeTab === "New Order") {
      setNewOrderCount(0);
      if (typeof window !== "undefined") {
        localStorage.removeItem("restro_new_orders");
      }
    }
  }, [activeTab]);

  /* ================= AUTOMATIC ARCHITECTURE HEARTBEAT SENSOR ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ================= REALTIME ENGINE SYSTEM SUBSCRIPTION ================= */
  useEffect(() => {
    if (!restro?.restro_code) return;

    const channel = supabase
      .channel(`restro-orders-${restro.restro_code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Orders",
          filter: `restroCode=eq.${restro.restro_code}`
        },
        async (payload: any) => {
          console.log("Realtime dynamic restro event fetched:", payload);
          
          setRefreshTick((prev) => prev + 1);

          // FIXED: Use payload.eventType to comply cleanly with Supabase types and pass Vercel builds
          if (payload.eventType === "INSERT") {
            if (payload.new?.Status === "New Order") {
              triggerAlert();
            }
          } else if (payload.eventType === "UPDATE") {
            // FIX REALTIME DUPLICATE SOUND PREVENTER INTERCEPTOR
            const oldStatus = payload.old?.Status;
            if (oldStatus === "New Order") {
              return; 
            }
            if (payload.new?.Status === "New Order") {
              triggerAlert();
            }
          }
        }
      )
      .subscribe();

    function triggerAlert() {
      setNewOrderCount((prev) => {
        const nextCount = prev + 1;
        if (typeof window !== "undefined") {
          localStorage.setItem("restro_new_orders", String(nextCount));
        }
        return nextCount;
      });

      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
      } catch (err) {
        console.log("Audio blocked by layout environment restriction metrics");
      }

      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🚆 New RailEats Order Received", {
            body: `Order waiting in kitchen production panel.`
          });
        }
      } catch (e) {}
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restro]);

  /* ================= REFRESH TICK COMPONENT DATA SYNC ENGINE ================= */
  useEffect(() => {
    if (!restro?.restro_code) return;

    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/restro/orders?restro_code=${restro.restro_code}`, {
          cache: "no-store"
        });
        const result = await response.json();
        if (result.ok) {
          setOrders(result.orders || []);
        }
      } catch (error) {
        console.error("Critical error mapping restro orders data sequence pipeline:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [restro, refreshTick]);

  /* ================= DATA SEGMENTATION AND RE-FILTERING MACHINE ================= */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const mainStatus = (order.Status || "").trim();
      const subStatus = (order.SubStatus || "").trim();
      const currentTabLower = activeTab.toLowerCase().trim();

      if (currentTabLower === "bad delivery") {
        return mainStatus.toLowerCase() === "delivered" && subStatus.toLowerCase() === "bad delivery";
      }
      if (currentTabLower === "delivered") {
        return mainStatus.toLowerCase() === "delivered" && subStatus.toLowerCase() !== "bad delivery";
      }
      return mainStatus.toLowerCase() === currentTabLower;
    });
  }, [orders, activeTab]);

  /* ================= STATUS CHANGE EXECUTION TRANSLATION LAYER ================= */
  async function updateOrderStatus(orderId: string, nextStatus: string, subStatusValue = "", systemRemarks = "") {
    try {
      setSubmittingAction(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: nextStatus,
          subStatus: subStatusValue,
          remarks: systemRemarks,
          changedBy: restro?.restro_name || "Restaurant Partner",
          actionSource: "restaurant"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Failed to finalize order workflow assignment routing.");
        return;
      }

      setActionModalOpen(false);
      setSelectedOrder(null);
      setSubStatus("");
      setRemarks("");
      
      // Force instant refresh trigger
      setRefreshTick((prev) => prev + 1);
    } catch (e) {
      alert("Network transmission error updating status registry entries.");
    } finally {
      setSubmittingAction(false);
    }
  }

  /* ================= DYNAMIC VISUAL BADGE ENGINE COLOR CODES ================= */
  function getStatusBadgeStyle(order: any) {
    const main = (order.Status || "").toLowerCase().trim();
    const sub = (order.SubStatus || "").toLowerCase().trim();

    if (main === "delivered" && sub === "bad delivery") {
      return { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" }; // Dark Red
    }
    if (main === "delivered") {
      return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" }; // Green
    }
    if (main === "cancelled") {
      return { bg: "#fff5f5", text: "#c53030", border: "#feb2b2" }; // Red
    }
    if (main === "in kitchen") {
      return { bg: "#fef9c3", text: "#854d0e", border: "#fef08a" }; // Yellow
    }
    if (main === "out for delivery") {
      return { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }; // Blue
    }
    if (main === "new order") {
      return { bg: "#fff7ed", text: "#c2410c", border: "#ffedd5" }; // Orange
    }
    return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" }; // Grey default fallback
  }

  function handleDirectStep(order: any, nextStatus: string) {
    if (confirm(`Are you sure you want to transition this order to ${nextStatus}?`)) {
      updateOrderStatus(order.OrderId, nextStatus, "", `Moved straight into ${nextStatus} stage.`);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col font-sans selection:bg-[#2f54eb]/10 selection:text-[#2f54eb]">
      {/* HEADER SECTION SYSTEM */}
      <header className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2f54eb] to-[#597ef7] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-[#2f54eb]/20">
            {restro?.restro_name ? restro.restro_name.charAt(0).toUpperCase() : "R"}
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 tracking-tight max-w-[160px] truncate leading-tight">
              {restro?.restro_name || "Loading Panel..."}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">
              Code: {restro?.restro_code || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* INTENT-BASED TAB SWITCH MECHANICS */}
          <button
            onClick={() => setActiveTab("New Order")}
            className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center relative transition active:scale-95"
          >
            <span className="text-xl">🔔</span>
            {newOrderCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] px-1.5 h-5 min-w-[20px] rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {newOrderCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setRefreshTick((p) => p + 1)}
            className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center transition"
            title="Force synchronization check"
          >
            <span className={`text-lg ${loading ? "animate-spin" : ""}`}>🔄</span>
          </button>
        </div>
      </header>

      {/* HORIZONTAL SWIPING INTERFACE CONTAINER */}
      <div className="bg-white border-b border-gray-100 p-2 flex items-center gap-2 flex-shrink-0">
        <button
          disabled={tabSet === 0}
          onClick={() => setTabSet((p) => Math.max(0, p - 1))}
          className="w-8 h-9 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400 disabled:opacity-30 active:bg-gray-100"
        >
          ◀
        </button>

        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {visibleTabs.map((t) => {
            const isActive = activeTab.toLowerCase().trim() === t.label.toLowerCase().trim();
            return (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.label)}
                className={`h-9 px-2 rounded-lg text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition duration-150 ${
                  isActive
                    ? "bg-[#2f54eb] text-white shadow-sm shadow-[#2f54eb]/10"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 active:bg-gray-100"
                }`}
              >
                <span>{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={tabSet >= Math.floor(allTabs.length / 2)}
          onClick={() => setTabSet((p) => Math.min(Math.floor(allTabs.length / 2), p + 1))}
          className="w-8 h-9 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400 disabled:opacity-30 active:bg-gray-100"
        >
          ▶
        </button>
      </div>

      {/* ORDER COMPONENT CONTAINER ROW FEED */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {loading && orders.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-[#2f54eb] rounded-full animate-spin" />
            <span className="text-xs font-bold">Synchronizing real-time datasets...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <span className="text-4xl mb-2">📥</span>
            <h3 className="text-sm font-black text-gray-800">No active entries</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
              No orders found matching standard context criteria filter status "{activeTab}".
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const styleMetrics = getStatusBadgeStyle(order);
            const itemsList = Array.isArray(order.Items) ? order.Items : [];

            return (
              <div
                key={order.id || order.OrderId}
                className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col transition"
              >
                {/* CARD ROW HEADER PANEL */}
                <div className="p-3.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Order Identification</span>
                    <span className="text-xs font-black text-gray-900 tracking-tight">#{order.OrderId || order.id}</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: styleMetrics.bg,
                      color: styleMetrics.text,
                      borderColor: styleMetrics.border,
                    }}
                    className="text-[10px] font-black tracking-tight px-2.5 py-1 rounded-full border"
                  >
                    {order.SubStatus && (order.SubStatus).trim() ? `${order.Status} - ${order.SubStatus}` : order.Status}
                  </div>
                </div>

                {/* CENTRAL CONTENT CARD SEGMENT */}
                <div className="p-4 space-y-3.5 flex-1">
                  {/* LOGISTICAL STATION ROUTING DETAILS */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100/60">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Station Dropoff</span>
                      <span className="text-xs font-bold text-gray-800 truncate block">
                        {order.StationName || order.stationName || "N/A"} ({order.StationCode || order.stationCode || "???"})
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Schedule Parameters</span>
                      <span className="text-xs font-bold text-[#2f54eb] truncate block">
                        {order.DeliveryTime || "N/A"} • {order.DeliveryDate || ""}
                      </span>
                    </div>
                  </div>

                  {/* COCH / SEAT INFO */}
                  <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 text-gray-600 font-medium">
                    <span>Train: <strong className="text-gray-900">{order.TrainNumber || "N/A"}</strong></span>
                    <span>Coach: <strong className="text-gray-900">{order.Coach || "N/A"}</strong></span>
                    <span>Seat: <strong className="text-gray-900">{order.Seat || "N/A"}</strong></span>
                  </div>

                  {/* MINI INLINE PREVIEW OF ORDERED ITEMS */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Menu Items Payload</span>
                    <div className="text-xs text-gray-700 font-bold space-y-0.5">
                      {itemsList.slice(0, 2).map((it: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>• {it.item_name || "Menu item"} <span className="text-gray-400 font-normal">x{it.quantity || 1}</span></span>
                          <span className="text-gray-500 font-medium">₹{it.selling_price || "0"}</span>
                        </div>
                      ))}
                      {itemsList.length > 2 && (
                        <p className="text-[11px] text-[#2f54eb] font-semibold pt-0.5">
                          + {itemsList.length - 2} more items inside checkout array...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PRICE SUMMARY LINE */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                    <span className="text-gray-400 font-medium">Total Settlement Due:</span>
                    <span className="text-sm font-black text-gray-900">₹{order.TotalAmount || order.totalAmount || "0.00"}</span>
                  </div>
                </div>

                {/* FOOTER ACTIONS SUBSECTION */}
                <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2">
                  {/* EXPANDABLE COMPACT DETAILS MODAL LINK INTERACTION */}
                  <button
                    onClick={() => {
                      setDetailedOrder(order);
                      setDetailsModalOpen(true);
                    }}
                    className="w-full py-2 text-center text-xs font-black text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl transition shadow-sm active:bg-gray-50"
                  >
                    🔍 View Detailed Description Payload
                  </button>

                  {/* ACTION TRIGGER INTERFACE BUTTON MATRICES */}
                  {activeTab.toLowerCase().trim() === "new order" && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "In Kitchen")}
                        className="py-2.5 text-xs font-black rounded-xl bg-[#2f54eb] text-white transition hover:bg-[#1a3ec8] active:scale-95"
                      >
                        Accept Order 👍
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("cancel");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2.5 text-xs font-black rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"
                      >
                        Cancel Order ❌
                      </button>
                    </div>
                  )}

                  {activeTab.toLowerCase().trim() === "in kitchen" && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "Out for Delivery")}
                        className="py-2.5 text-xs font-black rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95"
                      >
                        Out For Delivery 🛵
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("cancel");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2.5 text-xs font-black rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"
                      >
                        Cancel Order ❌
                      </button>
                    </div>
                  )}

                  {activeTab.toLowerCase().trim() === "out for delivery" && (
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "Delivered")}
                        className="py-2 text-[11px] font-black rounded-xl bg-green-600 text-white transition hover:bg-green-700 active:scale-95"
                      >
                        Delivered ✅
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("baddelivery");
                          setSubStatus("Bad Delivery");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2 text-[11px] font-black rounded-xl bg-red-900 text-white transition hover:bg-red-950 active:scale-95"
                      >
                        Bad Delivery 🚨
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("notdelivered");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2 text-[11px] font-black rounded-xl bg-amber-500 text-white transition hover:bg-amber-600 active:scale-95"
                      >
                        Not Delv ⚠️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* COMPACT VIEW DETAILS EXPANDABLE DRAWER OVERLAY MODAL */}
      {detailsModalOpen && detailedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-0 transition">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-gray-900 text-base">Full Order Payload</h3>
                <p className="text-xs text-gray-400 mt-0.5">ID: #{detailedOrder.OrderId || detailedOrder.id}</p>
              </div>
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setDetailedOrder(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm active:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs flex-1">
              {/* CUSTOMER INFORMATION CRITERIA */}
              <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 border border-gray-100">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Customer Diagnostics</h4>
                <p className="font-bold text-gray-800 text-sm">{detailedOrder.CustomerName || "N/A"}</p>
                <p className="font-medium text-gray-500">Mobile: <strong className="text-gray-800">{detailedOrder.CustomerMobile || "N/A"}</strong></p>
              </div>

              {/* LOGISTICAL TRANSPORTATION SPECIFICATION ARRAY */}
              <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 border border-gray-100">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Logistics Parameters</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-600 font-medium">
                  <div>Station: <strong className="text-gray-900">{detailedOrder.StationName || "N/A"}</strong></div>
                  <div>Code: <strong className="text-gray-900">{detailedOrder.StationCode || "N/A"}</strong></div>
                  <div>Train No: <strong className="text-gray-900">{detailedOrder.TrainNumber || "N/A"}</strong></div>
                  <div>Delivery: <strong className="text-gray-900">{detailedOrder.DeliveryTime || ""}</strong></div>
                  <div>Coach: <strong className="text-gray-900">{detailedOrder.Coach || "N/A"}</strong></div>
                  <div>Seat / Berth: <strong className="text-gray-900">{detailedOrder.Seat || "N/A"}</strong></div>
                </div>
              </div>

              {/* THE FULL ARRAY ITEMS CHECKOUT LIST VIEW */}
              <div className="space-y-2">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Items Manifest Verification</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {(Array.isArray(detailedOrder.Items) ? detailedOrder.Items : []).map((it: any, i: number) => (
                    <div key={i} className="p-3 bg-white flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{it.item_name || "Item Unit"}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Rate: ₹{it.selling_price || "0.00"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-800">x{it.quantity || 1}</p>
                        <p className="text-[11px] font-bold text-gray-900 mt-0.5">₹{(Number(it.selling_price || 0) * Number(it.quantity || 1)).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REMARKS AND METADATA */}
              {detailedOrder.Remarks && (
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/60 text-amber-900">
                  <h4 className="font-black text-[10px] tracking-wider uppercase text-amber-500 mb-0.5">Order Remarks Memo</h4>
                  <p className="font-medium leading-relaxed">{detailedOrder.Remarks}</p>
                </div>
              )}

              {/* FINAL AGGREGATE BLOCK PRICE */}
              <div className="bg-gray-900 text-white p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gross Aggregate Total:</span>
                <span className="text-base font-black">₹{detailedOrder.TotalAmount || detailedOrder.totalAmount || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS SUB-MODAL DECISION FRAMEWORK INTERFACES */}
      {actionModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-scale-up space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight">
                {actionType === "cancel" && "Confirm Order Cancellation"}
                {actionType === "baddelivery" && "Log Bad Delivery Settlement"}
                {actionType === "notdelivered" && "Log Delivery Omission Incident"}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Target Order Tracking Token: #{selectedOrder.OrderId}
              </p>
            </div>

            {/* SELECTION DROPDOWN CONDITIONAL MATRIX */}
            {actionType === "cancel" && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Reason Protocol</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold focus:bg-white"
                >
                  <option value="">-- Choose Intercept Reason --</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === "notdelivered" && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Omission Category Exception</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold focus:bg-white"
                >
                  <option value="">-- Choose Breakdown Code --</option>
                  {NOT_DELIVERED_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === "baddelivery" && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs text-red-900 font-medium leading-normal">
                ⚠️ <strong>Production Policy Alert:</strong> Submitting this report saves status configuration exactly as <strong>Status = "Delivered"</strong> and <strong>SubStatus = "Bad Delivery"</strong> sequence schemas.
              </div>
            )}

            {/* REMARKS FIELD AREA */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Additional Explanatory Notes</label>
              <textarea
                placeholder="Write logs context for system records summary (optional)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:bg-white resize-none"
              />
            </div>

            {/* BUTTON PACK REGISTRY CONTROL ACTIONS */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <button
                disabled={submittingAction}
                onClick={() => {
                  setActionModalOpen(false);
                  setSelectedOrder(null);
                  setSubStatus("");
                  setRemarks("");
                }}
                className="py-2 text-xs font-black rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
              >
                Close Window
              </button>
              <button
                disabled={submittingAction || (actionType !== "baddelivery" && !subStatus)}
                onClick={() => {
                  let mainStatusParam = "";
                  if (actionType === "cancel") mainStatusParam = "Cancelled";
                  else if (actionType === "notdelivered") mainStatusParam = "Not Delivered";
                  else if (actionType === "baddelivery") mainStatusParam = "Delivered";

                  updateOrderStatus(selectedOrder.OrderId, mainStatusParam, subStatus, remarks);
                }}
                className="py-2 text-xs font-black text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed select-none transition"
              >
                {submittingAction ? "Processing..." : "Commit Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER TAB INTERACTION BAR */}
      <footer className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">Orders</span>
        </button>

        <button
          onClick={() => router.push("/menu")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">🍽️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Menu</span>
        </button>

        <button
          onClick={() => router.push("/delivery-settings")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>

        <button
          onClick={() => router.push("/profile")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Profile</span>
        </button>
      </footer>
    </div>
  );
}
];

const NOT_DELIVERED_REASONS = [
  "Restro Missed",
  "Late Processing",
  "Technical Issue"
];

export default function OrdersPage() {
  const router = useRouter();

  const [restro, setRestro] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("New Order");
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  // Status Modals Configuration Engine State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [actionType, setActionType] = useState<"cancel" | "notdelivered" | "baddelivery" | null>(null);
  const [subStatus, setSubStatus] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  // Expandable Order Details Drawer State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailedOrder, setDetailedOrder] = useState<any>(null);

  const [newOrderCount, setNewOrderCount] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return Number(localStorage.getItem("restro_new_orders") || 0);
    }
    return 0;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tabSet, setTabSet] = useState(0);

  const allTabs = [
    { label: "New Order", icon: "🔔" },
    { label: "In Kitchen", icon: "🍳" },
    { label: "Out for Delivery", icon: "🛵" },
    { label: "Delivered", icon: "✅" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "⚠️" },
    { label: "Bad Delivery", icon: "🚨" }
  ];

  const visibleTabs = allTabs.slice(tabSet * 2, tabSet * 2 + 2);

  /* ================= AUDIO PARAMETERS & UNLOCKING SYSTEM ================= */
  useEffect(() => {
    audioRef.current = new Audio("/sounds/order_announcement.mp3");
    audioRef.current.preload = "auto";
    audioRef.current.volume = 1.0;

    const unlockAudio = async () => {
      try {
        if (audioRef.current) {
          audioRef.current.muted = true;
          await audioRef.current.play();
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.muted = false;
        }
      } catch (e) {
        console.log("Audio unlock system interaction delayed by browser engine policies");
      }
    };

    document.body.addEventListener("click", unlockAudio, { once: true });
    return () => {
      document.body.removeEventListener("click", unlockAudio);
    };
  }, []);

  /* ================= LOCAL STORAGE SAFE INTEGRATION IN RESTAURANT SECTOR ================= */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("current_restro");
      if (!stored) {
        router.push("/login");
        return;
      }
      setRestro(JSON.parse(stored));
    }
  }, [router]);

  /* ================= NOTIFICATION AND INTENT CONTROL LOGIC ================= */
  useEffect(() => {
    if (activeTab === "New Order") {
      setNewOrderCount(0);
      if (typeof window !== "undefined") {
        localStorage.removeItem("restro_new_orders");
      }
    }
  }, [activeTab]);

  /* ================= AUTOMATIC ARCHITECTURE HEARTBEAT SENSOR ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ================= REALTIME ENGINE SYSTEM SUBSCRIPTION ================= */
  useEffect(() => {
    if (!restro?.restro_code) return;

    const channel = supabase
      .channel(`restro-orders-${restro.restro_code}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "Orders",
          filter: `restroCode=eq.${restro.restro_code}`
        },
        async (payload) => {
          console.log("Realtime dynamic restro event fetched:", payload);
          
          setRefreshTick((prev) => prev + 1);

          if (payload.event === "INSERT") {
            if (payload.new?.Status === "New Order") {
              triggerAlert();
            }
          } else if (payload.event === "UPDATE") {
            // FIX REALTIME DUPLICATE SOUND PREVENTER INTERCEPTOR
            const oldStatus = payload.old?.Status;
            if (oldStatus === "New Order") {
              return; 
            }
            if (payload.new?.Status === "New Order") {
              triggerAlert();
            }
          }
        }
      )
      .subscribe();

    function triggerAlert() {
      setNewOrderCount((prev) => {
        const nextCount = prev + 1;
        if (typeof window !== "undefined") {
          localStorage.setItem("restro_new_orders", String(nextCount));
        }
        return nextCount;
      });

      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          audioRef.current.play();
        }
      } catch (err) {
        console.log("Audio blocked by layout environment restriction metrics");
      }

      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🚆 New RailEats Order Received", {
            body: `Order ID: ${selectedOrder?.id || ""} waiting in kitchen production panel.`
          });
        }
      } catch (e) {}
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restro]);

  /* ================= REFRESH TICK COMPONENT DATA SYNC ENGINE ================= */
  useEffect(() => {
    if (!restro?.restro_code) return;

    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/restro/orders?restro_code=${restro.restro_code}`, {
          cache: "no-store"
        });
        const result = await response.json();
        if (result.ok) {
          setOrders(result.orders || []);
        }
      } catch (error) {
        console.error("Critical error mapping restro orders data sequence pipeline:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [restro, refreshTick]);

  /* ================= DATA SEGMENTATION AND RE-FILTERING MACHINE ================= */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const mainStatus = (order.Status || "").trim();
      const subStatus = (order.SubStatus || "").trim();
      const currentTabLower = activeTab.toLowerCase().trim();

      if (currentTabLower === "bad delivery") {
        return mainStatus.toLowerCase() === "delivered" && subStatus.toLowerCase() === "bad delivery";
      }
      if (currentTabLower === "delivered") {
        return mainStatus.toLowerCase() === "delivered" && subStatus.toLowerCase() !== "bad delivery";
      }
      return mainStatus.toLowerCase() === currentTabLower;
    });
  }, [orders, activeTab]);

  /* ================= STATUS CHANGE EXECUTION TRANSLATION LAYER ================= */
  async function updateOrderStatus(orderId: string, nextStatus: string, subStatusValue = "", systemRemarks = "") {
    try {
      setSubmittingAction(true);
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: nextStatus,
          subStatus: subStatusValue,
          remarks: systemRemarks,
          changedBy: restro?.restro_name || "Restaurant Partner",
          actionSource: "restaurant"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.error || "Failed to finalize order workflow assignment routing.");
        return;
      }

      setActionModalOpen(false);
      setSelectedOrder(null);
      setSubStatus("");
      setRemarks("");
      
      // Force instant refresh trigger
      setRefreshTick((prev) => prev + 1);
    } catch (e) {
      alert("Network transmission error updating status registry entries.");
    } finally {
      setSubmittingAction(false);
    }
  }

  /* ================= DYNAMIC VISUAL BADGE ENGINE COLOR CODES ================= */
  function getStatusBadgeStyle(order: any) {
    const main = (order.Status || "").toLowerCase().trim();
    const sub = (order.SubStatus || "").toLowerCase().trim();

    if (main === "delivered" && sub === "bad delivery") {
      return { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" }; // Dark Red
    }
    if (main === "delivered") {
      return { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" }; // Green
    }
    if (main === "cancelled") {
      return { bg: "#fff5f5", text: "#c53030", border: "#feb2b2" }; // Red
    }
    if (main === "in kitchen") {
      return { bg: "#fef9c3", text: "#854d0e", border: "#fef08a" }; // Yellow
    }
    if (main === "out for delivery") {
      return { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" }; // Blue
    }
    if (main === "new order") {
      return { bg: "#fff7ed", text: "#c2410c", border: "#ffedd5" }; // Orange
    }
    return { bg: "#f3f4f6", text: "#374151", border: "#e5e7eb" }; // Grey default fallback
  }

  function handleDirectStep(order: any, nextStatus: string) {
    if (confirm(`Are you sure you want to transition this order to ${nextStatus}?`)) {
      updateOrderStatus(order.OrderId, nextStatus, "", `Moved straight into ${nextStatus} stage.`);
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col font-sans selection:bg-[#2f54eb]/10 selection:text-[#2f54eb]">
      {/* HEADER SECTION SYSTEM */}
      <header className="bg-white border-b border-gray-100 px-4 h-16 flex items-center justify-between sticky top-0 z-40 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2f54eb] to-[#597ef7] flex items-center justify-center text-white font-black text-lg shadow-sm shadow-[#2f54eb]/20">
            {restro?.restro_name ? restro.restro_name.charAt(0).toUpperCase() : "R"}
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 tracking-tight max-w-[160px] truncate leading-tight">
              {restro?.restro_name || "Loading Panel..."}
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mt-0.5">
              Code: {restro?.restro_code || "N/A"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* INTENT-BASED TAB SWITCH MECHANICS */}
          <button
            onClick={() => setActiveTab("New Order")}
            className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center relative transition active:scale-95"
          >
            <span className="text-xl">🔔</span>
            {newOrderCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[10px] px-1.5 h-5 min-w-[20px] rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                {newOrderCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setRefreshTick((p) => p + 1)}
            className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center transition"
            title="Force synchronization check"
          >
            <span className={`text-lg ${loading ? "animate-spin" : ""}`}>🔄</span>
          </button>
        </div>
      </header>

      {/* HORIZONTAL SWIPING INTERFACE CONTAINER */}
      <div className="bg-white border-b border-gray-100 p-2 flex items-center gap-2 flex-shrink-0">
        <button
          disabled={tabSet === 0}
          onClick={() => setTabSet((p) => Math.max(0, p - 1))}
          className="w-8 h-9 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400 disabled:opacity-30 active:bg-gray-100"
        >
          ◀
        </button>

        <div className="flex-1 grid grid-cols-2 gap-1.5">
          {visibleTabs.map((t) => {
            const isActive = activeTab.toLowerCase().trim() === t.label.toLowerCase().trim();
            return (
              <button
                key={t.label}
                onClick={() => setActiveTab(t.label)}
                className={`h-9 px-2 rounded-lg text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition duration-150 ${
                  isActive
                    ? "bg-[#2f54eb] text-white shadow-sm shadow-[#2f54eb]/10"
                    : "bg-gray-50 text-gray-500 hover:text-gray-700 active:bg-gray-100"
                }`}
              >
                <span>{t.icon}</span>
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </div>

        <button
          disabled={tabSet >= Math.floor(allTabs.length / 2)}
          onClick={() => setTabSet((p) => Math.min(Math.floor(allTabs.length / 2), p + 1))}
          className="w-8 h-9 rounded-lg bg-gray-50 flex items-center justify-center font-bold text-gray-400 disabled:opacity-30 active:bg-gray-100"
        >
          ▶
        </button>
      </div>

      {/* ORDER COMPONENT CONTAINER ROW FEED */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {loading && orders.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-[#2f54eb] rounded-full animate-spin" />
            <span className="text-xs font-bold">Synchronizing real-time datasets...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center px-4 bg-white rounded-2xl border border-dashed border-gray-200">
            <span className="text-4xl mb-2">📥</span>
            <h3 className="text-sm font-black text-gray-800">No active entries</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
              No orders found matches standard context criteria filter status "{activeTab}".
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const styleMetrics = getStatusBadgeStyle(order);
            const itemsList = Array.isArray(order.Items) ? order.Items : [];

            return (
              <div
                key={order.id || order.OrderId}
                className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.015)] overflow-hidden flex flex-col transition"
              >
                {/* CARD ROW HEADER PANEL */}
                <div className="p-3.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Order Identification</span>
                    <span className="text-xs font-black text-gray-900 tracking-tight">#{order.OrderId || order.id}</span>
                  </div>
                  <div
                    style={{
                      backgroundColor: styleMetrics.bg,
                      color: styleMetrics.text,
                      borderColor: styleMetrics.border,
                    }}
                    className="text-[10px] font-black tracking-tight px-2.5 py-1 rounded-full border"
                  >
                    {order.SubStatus && (order.SubStatus).trim() ? `${order.Status} - ${order.SubStatus}` : order.Status}
                  </div>
                </div>

                {/* CENTRAL CONTENT CARD SEGMENT */}
                <div className="p-4 space-y-3.5 flex-1">
                  {/* LOGISTICAL STATION ROUTING DETAILS */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100/60">
                    <div>
                      <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Station Dropoff</span>
                      <span className="text-xs font-bold text-gray-800 truncate block">
                        {order.StationName || order.stationName || "N/A"} ({order.StationCode || order.stationCode || "???"})
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Schedule Parameters</span>
                      <span className="text-xs font-bold text-[#2f54eb] truncate block">
                        {order.DeliveryTime || "N/A"} • {order.DeliveryDate || ""}
                      </span>
                    </div>
                  </div>

                  {/* COCH / SEAT INFO */}
                  <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 text-gray-600 font-medium">
                    <span>Train: <strong className="text-gray-900">{order.TrainNumber || "N/A"}</strong></span>
                    <span>Coach: <strong className="text-gray-900">{order.Coach || "N/A"}</strong></span>
                    <span>Seat: <strong className="text-gray-900">{order.Seat || "N/A"}</strong></span>
                  </div>

                  {/* MINI INLINE PREVIEW OF ORDERED ITEMS */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-gray-400 tracking-wider uppercase block">Menu Items Payload</span>
                    <div className="text-xs text-gray-700 font-bold space-y-0.5">
                      {itemsList.slice(0, 2).map((it: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>• {it.item_name || "Menu item"} <span className="text-gray-400 font-normal">x{it.quantity || 1}</span></span>
                          <span className="text-gray-500 font-medium">₹{it.selling_price || "0"}</span>
                        </div>
                      ))}
                      {itemsList.length > 2 && (
                        <p className="text-[11px] text-[#2f54eb] font-semibold pt-0.5">
                          + {itemsList.length - 2} more items inside checkout array...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* PRICE SUMMARY LINE */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-xs">
                    <span className="text-gray-400 font-medium">Total Settlement Due:</span>
                    <span className="text-sm font-black text-gray-900">₹{order.TotalAmount || order.totalAmount || "0.00"}</span>
                  </div>
                </div>

                {/* FOOTER ACTIONS SUBSECTION */}
                <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-2">
                  {/* EXPANDABLE COMPACT DETAILS MODAL LINK INTERACTION */}
                  <button
                    onClick={() => {
                      setDetailedOrder(order);
                      setDetailsModalOpen(true);
                    }}
                    className="w-full py-2 text-center text-xs font-black text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-xl transition shadow-sm active:bg-gray-50"
                  >
                    🔍 View Detailed Description Payload
                  </button>

                  {/* ACTION TRIGGER INTERFACE BUTTON MATRICES */}
                  {activeTab.toLowerCase().trim() === "new order" && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "In Kitchen")}
                        className="py-2.5 text-xs font-black rounded-xl bg-[#2f54eb] text-white transition hover:bg-[#1a3ec8] active:scale-95"
                      >
                        Accept Order 👍
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("cancel");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2.5 text-xs font-black rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"
                      >
                        Cancel Order ❌
                      </button>
                    </div>
                  )}

                  {activeTab.toLowerCase().trim() === "in kitchen" && (
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "Out for Delivery")}
                        className="py-2.5 text-xs font-black rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95"
                      >
                        Out For Delivery 🛵
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("cancel");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2.5 text-xs font-black rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100 active:scale-95"
                      >
                        Cancel Order ❌
                      </button>
                    </div>
                  )}

                  {activeTab.toLowerCase().trim() === "out for delivery" && (
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      <button
                        onClick={() => handleDirectStep(order, "Delivered")}
                        className="py-2 text-[11px] font-black rounded-xl bg-green-600 text-white transition hover:bg-green-700 active:scale-95"
                      >
                        Delivered ✅
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("baddelivery");
                          setSubStatus("Bad Delivery");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2 text-[11px] font-black rounded-xl bg-red-900 text-white transition hover:bg-red-950 active:scale-95"
                      >
                        Bad Delivery 🚨
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setActionType("notdelivered");
                          setSubStatus("");
                          setRemarks("");
                          setActionModalOpen(true);
                        }}
                        className="py-2 text-[11px] font-black rounded-xl bg-amber-500 text-white transition hover:bg-amber-600 active:scale-95"
                      >
                        Not Delv ⚠️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* COMPACT VIEW DETAILS EXPANDABLE DRAWER OVERLAY MODAL */}
      {detailsModalOpen && detailedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-0 transition">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto flex flex-col animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-gray-900 text-base">Full Order Payload</h3>
                <p className="text-xs text-gray-400 mt-0.5">ID: #{detailedOrder.OrderId || detailedOrder.id}</p>
              </div>
              <button
                onClick={() => {
                  setDetailsModalOpen(false);
                  setDetailedOrder(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm active:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs flex-1">
              {/* CUSTOMER INFORMATION CRITERIA */}
              <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 border border-gray-100">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Customer Diagnostics</h4>
                <p className="font-bold text-gray-800 text-sm">{detailedOrder.CustomerName || "N/A"}</p>
                <p className="font-medium text-gray-500">Mobile: <strong className="text-gray-800">{detailedOrder.CustomerMobile || "N/A"}</strong></p>
              </div>

              {/* LOGISTICAL TRANSPORTATION SPECIFICATION ARRAY */}
              <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 border border-gray-100">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Logistics Parameters</h4>
                <div className="grid grid-cols-2 gap-2 text-gray-600 font-medium">
                  <div>Station: <strong className="text-gray-900">{detailedOrder.StationName || "N/A"}</strong></div>
                  <div>Code: <strong className="text-gray-900">{detailedOrder.StationCode || "N/A"}</strong></div>
                  <div>Train No: <strong className="text-gray-900">{detailedOrder.TrainNumber || "N/A"}</strong></div>
                  <div>Delivery: <strong className="text-gray-900">{detailedOrder.DeliveryTime || ""}</strong></div>
                  <div>Coach: <strong className="text-gray-900">{detailedOrder.Coach || "N/A"}</strong></div>
                  <div>Seat / Berth: <strong className="text-gray-900">{detailedOrder.Seat || "N/A"}</strong></div>
                </div>
              </div>

              {/* THE FULL ARRAY ITEMS CHEKOUT LIST VIEW */}
              <div className="space-y-2">
                <h4 className="font-black text-[10px] tracking-wider uppercase text-gray-400">Items Manifest Verification</h4>
                <div className="border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-50">
                  {(Array.isArray(detailedOrder.Items) ? detailedOrder.Items : []).map((it: any, i: number) => (
                    <div key={i} className="p-3 bg-white flex items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-gray-900 text-xs">{it.item_name || "Item Unit"}</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">Rate: ₹{it.selling_price || "0.00"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-800">x{it.quantity || 1}</p>
                        <p className="text-[11px] font-bold text-gray-900 mt-0.5">₹{(Number(it.selling_price || 0) * Number(it.quantity || 1)).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* REMARKS AND METADATA */}
              {detailedOrder.Remarks && (
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100/60 text-amber-900">
                  <h4 className="font-black text-[10px] tracking-wider uppercase text-amber-500 mb-0.5">Order Remarks Memo</h4>
                  <p className="font-medium leading-relaxed">{detailedOrder.Remarks}</p>
                </div>
              )}

              {/* FINAL AGGREGATE BLOCK PRICE */}
              <div className="bg-gray-900 text-white p-4 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gross Aggregate Total:</span>
                <span className="text-base font-black">₹{detailedOrder.TotalAmount || detailedOrder.totalAmount || "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STATUS SUB-MODAL DECISION FRAMEWORK INTERFACES */}
      {actionModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-scale-up space-y-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 tracking-tight">
                {actionType === "cancel" && "Confirm Order Cancellation"}
                {actionType === "baddelivery" && "Log Bad Delivery Settlement"}
                {actionType === "notdelivered" && "Log Delivery Omission Incident"}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                Target Order Tracking Token: #{selectedOrder.OrderId}
              </p>
            </div>

            {/* SELECTION DROPDOWN CONDITIONAL MATRIX */}
            {actionType === "cancel" && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Reason Protocol</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold focus:bg-white"
                >
                  <option value="">-- Choose Intercept Reason --</option>
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === "notdelivered" && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Omission Category Exception</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold focus:bg-white"
                >
                  <option value="">-- Choose Breakdown Code --</option>
                  {NOT_DELIVERED_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            {actionType === "baddelivery" && (
              <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs text-red-900 font-medium leading-normal">
                ⚠️ <strong>Production Policy Alert:</strong> Submitting this report saves status configuration exactly as <strong>Status = "Delivered"</strong> and <strong>SubStatus = "Bad Delivery"</strong> sequence schemas.
              </div>
            )}

            {/* REMARKS FIELD AREA */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Additional Explanatory Notes</label>
              <textarea
                placeholder="Write logs context for system records summary (optional)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 font-medium focus:bg-white resize-none"
              />
            </div>

            {/* BUTTON PACK REGISTRY CONTROL ACTIONS */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
              <button
                disabled={submittingAction}
                onClick={() => {
                  setActionModalOpen(false);
                  setSelectedOrder(null);
                  setSubStatus("");
                  setRemarks("");
                }}
                className="py-2 text-xs font-black rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50"
              >
                Close Window
              </button>
              <button
                disabled={submittingAction || (actionType !== "baddelivery" && !subStatus)}
                onClick={() => {
                  let mainStatusParam = "";
                  if (actionType === "cancel") mainStatusParam = "Cancelled";
                  else if (actionType === "notdelivered") mainStatusParam = "Not Delivered";
                  else if (actionType === "baddelivery") mainStatusParam = "Delivered"; // CRITICAL COMPLIANCE ENGINE CRITERIA RULES

                  updateOrderStatus(selectedOrder.OrderId, mainStatusParam, subStatus, remarks);
                }}
                className="py-2 text-xs font-black text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed select-none transition"
              >
                {submittingAction ? "Processing..." : "Commit Action"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER TAB INTERACTION BAR */}
      <footer className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">Orders</span>
        </button>

        <button
          onClick={() => router.push("/menu")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">🍽️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Menu</span>
        </button>

        <button
          onClick={() => router.push("/delivery-settings")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>

        <button
          onClick={() => router.push("/profile")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Profile</span>
        </button>
      </footer>
    </div>
  );
}
