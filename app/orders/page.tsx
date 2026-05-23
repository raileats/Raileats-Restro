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
    <div className="min-h-screen bg-[#f7f9fc] pb-24 font-sans text-gray-900 max-w-md mx-auto relative shadow-2xl bg-white">
      
      {/* FIXED TOP HEADER */}
      <header className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f4b400] rounded-xl flex items-center justify-center font-bold text-black text-xs overflow-hidden">
            <img 
              src="/logo.png" 
              alt="logo" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            RE
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-gray-900">RailEats</h1>
            <p className="text-xs text-gray-500 font-semibold">{restro?.RestroName || "Mizaz E Bhopal"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#2f54eb] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
            {filteredOrders.length}
          </div>
          <button className="relative w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-lg">
            🔔
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* SCREEN TITLE & STATION META */}
      <div className="p-4 flex flex-col gap-0.5">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Orders</h2>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Station : <span className="text-[#2f54eb] font-extrabold">{restro?.StationCode || "BPL"}</span>
        </p>
      </div>

      {/* HORIZONTAL STATUS FILTER TABS */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-none snap-x">
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
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-150 snap-ml-4 ${
                isActive
                  ? "bg-[#2f54eb] text-white border-[#2f54eb] shadow-md shadow-blue-100"
                  : "bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ORDERS LIST */}
      <main className="px-4 space-y-4">
        {loading ? (
          <div className="py-24 text-center font-bold text-sm text-gray-400 animate-pulse flex flex-col items-center gap-2">
            <span className="text-2xl animate-spin">⏳</span>
            Fetching Fresh Orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <div className="text-5xl mb-3">🍱</div>
            <h3 className="text-lg font-black text-gray-800">No Orders Present</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Orders matching "{activeTab}" category are empty right now.
            </p>
          </div>
        ) : (
          filteredOrders.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm relative flex flex-col gap-4"
            >
              {/* Card Header Info */}
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-[#2f54eb] font-extrabold text-[11px] px-3 py-1 rounded-lg tracking-wide">
                  #{item.OrderId || "RE-20251126174731-960"}
                </span>
                <span className="bg-orange-50 text-orange-600 font-extrabold text-[11px] px-3 py-1 rounded-lg">
                  {item.Status || "Out for Delivery"}
                </span>
              </div>

              {/* Customer Primary Details */}
              <div className="flex items-center justify-between border-b border-dashed border-gray-100 pb-3">
                <div>
                  <h4 className="font-black text-lg text-gray-900 leading-snug">
                    {item.CustomerName || "ssduffv sjfhjf"}
                  </h4>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">
                    {item.CustomerMobile || "9819876378"}
                  </p>
                </div>
                {item.CustomerMobile && (
                  <a 
                    href={`tel:${item.CustomerMobile}`} 
                    className="w-10 h-10 bg-blue-50 hover:bg-blue-100 rounded-full flex items-center justify-center transition"
                  >
                    <svg className="w-4 h-4 text-[#2f54eb]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-1C7.82 18 2 12.18 2 5V3z"/>
                    </svg>
                  </a>
                )}
              </div>

              {/* Grid Train Logistics Mapping */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">🚆</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Train</p>
                    <p className="font-black text-gray-800 text-sm">{item.TrainNumber || "12716"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">💺</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Coach / Seat</p>
                    <p className="font-black text-gray-800 text-sm">{item.Coach || "B4"} / {item.Seat || "99"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">📅</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Date</p>
                    <p className="font-black text-gray-800 text-sm">{item.DeliveryDate || "2025-11-27"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">🕒</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Time</p>
                    <p className="font-black text-gray-800 text-sm">{item.DeliveryTime || "22:40:00"}</p>
                  </div>
                </div>
              </div>

              {/* Outlet Details & Action CTA Button */}
              <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <span className="text-base">🏪</span>
                  <span className="truncate max-w-[140px]">{item.RestroName || "Mizaz E Bhopal"}</span>
                </div>
                <button className="bg-blue-50/70 hover:bg-blue-100/80 px-4 py-2 rounded-xl text-xs font-black text-[#2f54eb] flex items-center gap-1 transition">
                  View Details
                  <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 z-50 shadow-xl">
        <button className="flex flex-col items-center justify-center flex-1 text-[#2f54eb]">
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">Orders</span>
        </button>
        <button 
          onClick={() => router.push("/profile")} 
          className="flex flex-col items-center justify-center flex-1 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Profile</span>
        </button>
        <button 
          onClick={() => router.push("/delivery-settings")} 
          className="flex flex-col items-center justify-center flex-1 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>
        <button 
          onClick={logout} 
          className="flex flex-col items-center justify-center flex-1 text-red-400 hover:text-red-500 transition"
        >
          <span className="text-xl">🚪</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Logout</span>
        </button>
      </nav>

    </div>
  );
}
