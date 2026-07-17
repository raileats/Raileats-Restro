"use client";

import { useEffect, useRef, useState, type TouchEvent } from "react";
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
  const [actionType, setActionType] = useState<"cancel" | "notdelivered" | "baddelivery" | "inkitchen" | "outfordelivery" | "delivered" | null>(null);
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
    { label: "Delivered", icon: "✅" },
    { label: "Cancelled", icon: "❌" },
    { label: "Not Delivered", icon: "⚠️" },
    { label: "Bad Delivery", icon: "🚨" }
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

      // FETCH ORDERS (Filtering based on RestroCode from Supabase)
      const { data, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("RestroCode", restroData.RestroCode)
        .order("CreatedAt", { ascending: false });

      if (error) throw error;

      setOrders(data || []);

      setLoading(false);
    } catch (err) {
      console.log(err);
      setPageError("Orders load nahi ho paaye. Internet check karke Retry karein.");
      setLoading(false);
    }
  }

  // Handle updates mapped to the Schema (Matching primary key string 'OrderId')
  async function handleUpdateStatus(order: any, targetStatus: string, finalSubStatus = "", finalRemarks = "") {
    try {
      setSubmittingAction(true);
      const changedAt = new Date().toISOString();
      const oldStatus = order?.Status ?? order?.OrderStatus ?? order?.CurrentStatus ?? null;
      const restroName =
        restro?.RestroName ||
        order?.RestroName ||
        order?.OutletName ||
        "Restro";
      const cleanRemarks = String(finalRemarks || "").trim();
      
      // Database Schema matching object payload
      const { error } = await supabase
        .from("Orders")
        .update({
          Status: targetStatus,
          SubStatus: finalSubStatus || null,
          UpdatedAt: changedAt
        })
        .eq("OrderId", order.OrderId); // Filter mapped with OrderId string primary key

      if (error) throw error;

      const { error: historyError } = await supabase
        .from("OrderStatusHistory")
        .insert({
          OrderId: order.OrderId,
          OldStatus: oldStatus,
          NewStatus: targetStatus,
          SubStatus: finalSubStatus || null,
          Remarks: cleanRemarks || null,
          Note: cleanRemarks || null,
          ChangedBy: restroName,
          UserType: "Restro",
          UserName: restroName,
          ActionSource: "Restro",
          ChangedAt: changedAt,
        });

      if (historyError) {
        console.error("Order history insert failed:", historyError);
      }

      // Close modals and trigger local view reload
      setActionModalOpen(false);
      setSelectedOrder(null);
      setActionType(null);
      setSubStatus("");
      setRemarks("");
      loadData();
    } catch (err) {
      alert("Failed to update order status. Please try again.");
      console.error(err);
    } finally {
      setSubmittingAction(false);
    }
  }

  const handleOpenActionModal = (order: any, type: typeof actionType) => {
    setSelectedOrder(order);
    setActionType(type);
    if (type === "cancel") setSubStatus(CANCEL_REASONS[0]);
    if (type === "notdelivered") setSubStatus(NOT_DELIVERED_REASONS[0]);
    setActionModalOpen(true);
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
    if (activeTab === "Delivered" && status === "delivered") {
      return true;
    }
    if (activeTab === "Cancelled" && status === "cancelled") {
      return true;
    }
    if (activeTab === "Not Delivered" && status === "not delivered") {
      return true;
    }
    if (activeTab === "Bad Delivery" && status === "bad delivery") {
      return true;
    }
    return false;
  });

  return (
    <div className="h-full w-full flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none overscroll-contain">
      
{/* DYNAMIC ACTION SUB-STATUS SELECTION MODAL ENGINE */}
      {actionModalOpen && selectedOrder && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center animate-fadeIn">
          <div className="bg-white w-full rounded-t-[32px] p-6 max-w-md shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 capitalize">
                Mark Order As: {actionType === "cancel" ? "Cancelled" : actionType === "notdelivered" ? "Not Delivered" : "Bad Delivery"}
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
            {(actionType === "cancel" || actionType === "notdelivered") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black uppercase text-gray-400 tracking-wider">Select Primary Reason</label>
                <select 
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#2f54eb]"
                >
                  {actionType === "cancel" 
                    ? CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)
                    : NOT_DELIVERED_REASONS.map((r) => <option key={r} value={r}>{r}</option>)
                  }
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
                let statusString = "Cancelled";
                if (actionType === "notdelivered") statusString = "Not Delivered";
                if (actionType === "baddelivery") statusString = "Bad Delivery";
                handleUpdateStatus(selectedOrder, statusString, subStatus, remarks);
              }}
              className="w-full bg-gray-900 text-white font-black text-xs py-3 rounded-xl shadow-md active:scale-[0.99] transition mt-2 disabled:bg-gray-400"
            >
              {submittingAction ? "Processing Update..." : "Confirm Status Change"}
            </button>
          </div>
        </div>
      )}

      {/* EXPANDABLE DRILLDOWN DRAWER MODAL */}
      {detailsModalOpen && detailedOrder && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-[32px] p-5 max-w-md shadow-2xl flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900">Order Parameters</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">ID: #{detailedOrder.OrderId}</p>
              </div>
              <button 
                onClick={() => { setDetailedOrder(null); setDetailsModalOpen(false); }}
                className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Core Snapshot Details Block */}
            <div className="space-y-2.5 text-xs font-semibold text-gray-700">
              <div className="flex justify-between"><span className="text-gray-400">Status:</span><span className="font-bold text-blue-600">{detailedOrder.Status}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Customer:</span><span>{detailedOrder.CustomerName}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mobile:</span><span>{detailedOrder.CustomerMobile || "N/A"}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Train / Coach / Seat:</span><span>{detailedOrder.TrainNumber} / {detailedOrder.Coach} / {detailedOrder.Seat}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Delivery Schedule:</span><span>{detailedOrder.DeliveryDate} ({detailedOrder.DeliveryTime})</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Total Amount:</span><span className="font-bold text-gray-900">₹{detailedOrder.TotalAmount}</span></div>
              {detailedOrder.SubStatus && <div className="flex justify-between"><span className="text-gray-400">Reason Tag:</span><span className="text-red-500 font-bold">{detailedOrder.SubStatus}</span></div>}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
