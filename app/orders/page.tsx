"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrdersPage() {
  const router = useRouter();

  const [restro, setRestro] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("Out for Delivery");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const stored = localStorage.getItem("restro");

      if (!stored) {
        router.push("/");
        return;
      }

      const restroData = JSON.parse(stored);
      setRestro(restroData);

      // FETCH ORDERS
      const { data, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("RestroCode", restroData.RestroCode)
        .order("CreatedAt", { ascending: false });

      if (!error && data) {
        setOrders(data);
      }

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("restro");
    router.push("/");
  }

  // FILTER ORDERS ACCORDING TO ACTIVE STATUS PILL
  const filteredOrders = orders.filter((item) => {
    const status = item.Status?.toLowerCase().trim();
    if (activeTab === "In Kitchen" && status === "inkitchen") return true;
    if (activeTab === "Out for Delivery" && status === "outfordelivery") return true;
    if (activeTab === "Delivered" && status === "delivered") return true;
    if (activeTab === "Cancelled" && status === "cancelled") return true;
    if (activeTab === "Not Delivered" && status === "notdelivered") return true;
    if (activeTab === "Bad Delivery" && status === "baddelivery") return true;
    return false;
  });

  return (
    <div className="h-[100dvh] max-w-md mx-auto flex flex-col bg-white overflow-hidden relative shadow-2xl border-x border-gray-100">
      
      {/* 1. APP HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f4b400] rounded-xl flex items-center justify-center font-bold text-black text-xs overflow-hidden shadow-sm">
            <img 
              src="/logo.png" 
              alt="logo" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            RE
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900 leading-none mb-0.5">RailEats</h1>
            <p className="text-xs text-gray-500 font-semibold truncate max-w-[180px]">{restro?.RestroName || "Mizaz E Bhopal"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <div className="bg-[#2f54eb] text-white text-xs font-black px-2.5 py-1.5 rounded-lg">
            {filteredOrders.length}
          </div>
          <button className="relative w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-base">
            🔔
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* TABS & META WRAPPER */}
      <div className="bg-white flex-shrink-0 pt-3">
        {/* STATION META */}
        <div className="px-4 mb-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">
            Station : <span className="text-[#2f54eb] font-extrabold">{restro?.StationCode || "BPL"}</span>
          </p>
        </div>

        {/* HORIZONTAL STATUS FILTER TABS */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-none snap-x">
          {[
            { label: "In Kitchen", icon: "🍳" },
            { label: "Out for Delivery", icon: "🛵" },
            { label: "Delivered", icon: "✅" },
            { label: "Cancelled", icon: "❌" },
            { label: "Not Delivered", icon: "⚠️" },
            { label: "Bad Delivery", icon: "🚨" }
          ].map((tab) => {
            const isActive = activeTab === tab.label;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-bold border transition-all duration-150 snap-ml-4 ${
                  isActive
                    ? "bg-[#2f54eb] text-white border-[#2f54eb] shadow-md shadow-blue-100"
                    : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MIDDLE ORDERS SCROLL AREA */}
      <main className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2">
            <span className="text-2xl animate-spin">⏳</span>
            Fetching Fresh Orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-gray-100 p-6 shadow-sm my-auto flex flex-col items-center justify-center">
            <span className="text-5xl mb-3">🍱</span>
            <h3 className="text-base font-black text-gray-800">No Orders Present</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium max-w-[240px]">
              Orders matching "{activeTab}" category are empty right now.
            </p>
          </div>
        ) : (
          filteredOrders.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3.5 relative"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-[#2f54eb] font-extrabold text-[10px] px-2.5 py-1 rounded-lg tracking-wide">
                  #{item.OrderId || "RE-20251126174731-960"}
                </span>
                <span className="bg-orange-50 text-orange-600 font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
                  {item.Status || "Out for Delivery"}
                </span>
              </div>

              {/* Customer Primary Details */}
              <div className="flex items-center justify-between border-b border-dashed border-gray-100 pb-3">
                <div>
                  <h4 className="font-black text-base text-gray-900 leading-snug">
                    {item.CustomerName || "Customer Name"}
                  </h4>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">
                    {item.CustomerMobile || "9819876378"}
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

              {/* Grid Logistics Mapping */}
              <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">🚂</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Train</p>
                    <p className="font-black text-gray-800 text-xs mt-1">{item.TrainNumber || "12716"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">💺</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Coach / Seat</p>
                    <p className="font-black text-gray-800 text-xs mt-1">{item.Coach || "B4"} / {item.Seat || "99"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">📅</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Date</p>
                    <p className="font-black text-gray-800 text-xs mt-1">{item.DeliveryDate || "2025-11-27"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="text-lg mt-0.5">🕒</span>
                  <div className="flex flex-col">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none">Time</p>
                    <p className="font-black text-gray-800 text-xs mt-1">{item.DeliveryTime || "22:40:00"}</p>
                  </div>
                </div>
              </div>

              {/* Outlet Details & Action CTA Button */}
              <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500">
                  <span className="text-sm">🏪</span>
                  <span className="truncate max-w-[120px]">{item.RestroName || "Mizaz E Bhopal"}</span>
                </div>
                <button className="bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-[11px] font-black text-[#2f54eb] flex items-center gap-0.5 transition">
                  View Details
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* 3. ALWAYS FIXED BOTTOM NAVIGATION BAR */}
      <nav className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-lg">📋</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">Orders</span>
        </button>
        <button 
          onClick={() => router.push("/delivery-settings")} 
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>
        <button 
          onClick={() => router.push("/profile")} 
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Profile</span>
        </button>
        <button 
          onClick={logout} 
          className="flex flex-col items-center justify-center flex-1 h-full text-red-400 hover:text-red-500 transition"
        >
          <span className="text-lg">🚪</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Logout</span>
        </button>
      </nav>

    </div>
  );
}
