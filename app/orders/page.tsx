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
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none overscroll-contain">
      
      {/* 1. FIXED TOP APP HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white border border-yellow-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="RailEats" 
              className="w-full h-full object-contain rounded-full p-1" 
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <span className="hidden w-full h-full items-center justify-center rounded-full bg-[#f4b400] text-[11px] font-black text-black">RE</span>
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-gray-900 leading-none mb-0.5">
              RailEats
            </h1>
            <p className="text-xs text-gray-500 font-semibold truncate max-w-[160px]">
              {restro?.RestroName || "Loading..."}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#2f54eb] text-white text-xs font-black px-2.5 py-1.5 rounded-lg min-w-[28px] text-center">
            {filteredOrders.length}
          </div>

          <button
            onClick={() => {
              setNewOrderCount(0);
              clearStoredNewOrderCount();
              setActiveTab("New Order");
            }}
            className="relative w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-base"
          >
            🔔
            {newOrderCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {newOrderCount}
              </span>
            )}
          </button>
        </div>
      </header>

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
                          onClick={() => handleUpdateStatus(item, "In Kitchen")}
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
                          onClick={() => handleUpdateStatus(item, "Out for Delivery")}
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

                    {/* CASE 3: OUT FOR DELIVERY TAB -> DELIVERED / MISSED / BAD DELIVERY */}
                    {activeTab === "Out for Delivery" && (
                      <>
                        <button 
                          disabled={submittingAction}
                          onClick={() => handleUpdateStatus(item, "Delivered")}
                          className="bg-green-600 hover:bg-green-700 text-white font-black text-[12px] px-3 py-1.5 rounded-xl shadow-sm transition"
                        >
                          Delivered ✅
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(item, "notdelivered")}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                        >
                          Missed ⚠️
                        </button>
                        <button 
                          onClick={() => handleOpenActionModal(item, "baddelivery")}
                          className="bg-red-50 hover:bg-red-100 text-red-600 font-black text-[11px] px-2.5 py-1.5 rounded-xl transition"
                        >
                          Bad Delivery 🚨
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

      {/* 3. FIXED BOTTOM NAVIGATION BAR */}
      <nav className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe">
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
      </nav>

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
