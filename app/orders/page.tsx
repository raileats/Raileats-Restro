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
  const [activeTab, setActiveTab] = useState("New Order");
  const [loading, setLoading] = useState(true);
  
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

  const handleNextTabs = () => {
    if ((tabSet * 2) + 2 < allTabs.length) {
      setTabSet(tabSet + 1);
    } else {
      setTabSet(0); // वापस पहले सेट पर आ जाएँ
    }
  };

  const handlePrevTabs = () => {
    if (tabSet > 0) {
      setTabSet(tabSet - 1);
    } else {
      setTabSet(Math.floor((allTabs.length - 1) / 2)); // आखरी सेट पर जाएँ
    }
  };

  const filteredOrders = orders.filter((item) => {

  const status = item.Status?.toLowerCase().trim();
    if (
  activeTab === "New Order" &&
  (
    status === "new order" ||
    status === "neworder"
  )
) {
  return true;
}

  if (
    activeTab === "In Kitchen" &&
    status === "in kitchen"
  ) {
    return true;
  }

  if (
    activeTab === "Out for Delivery" &&
    status === "out for delivery"
  ) {
    return true;
  }

  if (
    activeTab === "Delivered" &&
    status === "delivered"
  ) {
    return true;
  }

  if (
    activeTab === "Cancelled" &&
    status === "cancelled"
  ) {
    return true;
  }

  if (
    activeTab === "Not Delivered" &&
    status === "not delivered"
  ) {
    return true;
  }

  if (
    activeTab === "Bad Delivery" &&
    status === "bad delivery"
  ) {
    return true;
  }

  return false;
});

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none touch-action-none">
      
      {/* 1. FIXED TOP APP HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f4b400] rounded-xl flex items-center justify-center font-bold text-black text-xs overflow-hidden shadow-sm flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="logo" 
              className="w-full h-full object-cover" 
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            RE
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-gray-900 leading-none mb-0.5">RailEats</h1>
            <p className="text-xs text-gray-500 font-semibold truncate max-w-[160px]">{restro?.RestroName || "Mizaz E Bhopal"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#2f54eb] text-white text-xs font-black px-2.5 py-1.5 rounded-lg min-w-[28px] text-center">
            {filteredOrders.length}
          </div>
          <button className="relative w-9 h-9 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-base">
            🔔
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* FIXED META & PACKED CONTROL TABS */}
      <div className="bg-white flex-shrink-0 pt-3 pb-3 border-b border-gray-100 z-40 w-full">
        {/* STATION META */}
        <div className="px-4 mb-3">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Orders</h2>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Station : <span className="text-[#2f54eb] font-extrabold">{restro?.StationCode || "BPL"}</span>
          </p>
        </div>

        {/* CONTROLS: EXACTLY TWO TABS AT A TIME */}
        <div className="flex items-center justify-between px-4 gap-2 w-full">
          {/* Left Arrow Button */}
          <button 
            onClick={handlePrevTabs}
            className="w-8 h-9 bg-gray-50 border border-gray-200/70 active:bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-black flex-shrink-0 text-xs shadow-sm"
          >
            ❮
          </button>

          {/* Active Grid Container for Two Items */}
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

          {/* Right Arrow Button */}
          <button 
            onClick={handleNextTabs}
            className="w-8 h-9 bg-gray-50 border border-gray-200/70 active:bg-gray-100 rounded-xl flex items-center justify-center text-gray-700 font-black flex-shrink-0 text-xs shadow-sm"
          >
            ❯
          </button>
        </div>
      </div>

      {/* 2. SCROLLABLE MIDDLE MAIN CONTENT VIEW */}
      <main className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4 touch-action-pan-y">
        {loading ? (
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
              key={index} 
              className="bg-white rounded-3xl border border-gray-100/80 p-4 shadow-sm flex flex-col gap-3.5 relative"
            >
              {/* Card Badge Metadata */}
              <div className="flex items-center justify-between">
                <span className="bg-blue-50 text-[#2f54eb] font-extrabold text-[10px] px-2.5 py-1 rounded-lg tracking-wide">
                  #{item.OrderId || "RE-960"}
                </span>
                <span className="bg-orange-50 text-orange-600 font-extrabold text-[10px] px-2.5 py-1 rounded-lg">
                  {item.Status || "Out for Delivery"}
                </span>
              </div>

              {/* Customer Core Profile */}
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

              {/* Grid Logistics Block */}
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

              {/* Footer CTA Trigger */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 min-w-0">
                  <span className="text-sm">🏪</span>
                  <span className="truncate max-w-[140px]">{item.RestroName}</span>
                </div>
                <button className="bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl text-[11px] font-black text-[#2f54eb] flex items-center gap-0.5 transition flex-shrink-0">
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

      {/* 3. UPDATED FIXED BOTTOM NAVIGATION BAR WITH MENU BUTTON */}
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

    </div>
  );
}
