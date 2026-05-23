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

  // FILTER ORDERS
  const filteredOrders = orders.filter((item) => {
    const status = item.Status?.toLowerCase().trim();
    if (activeTab === "In Kitchen" && status === "inkitchen") return true;
    if (activeTab === "Out for Delivery" && status === "outfordelivery") return true;
    if (activeTab === "Delivered" && status === "delivered") return true;
    if (activeTab === "Cancelled" && status === "cancelled") return true;
    return false;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24 font-sans text-gray-900 max-w-md mx-auto relative shadow-xl">
      
      {/* APP HEADER */}
      <header className="sticky top-0 bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#f4b400] rounded-xl flex items-center justify-center font-bold text-black text-xs shadow-sm">
            <img src="/logo.png" alt="logo" className="w-7 h-7 object-contain" onError={(e)=>{e.currentTarget.style.display='none'}} />
            RailEats
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-gray-900">RailEats</h1>
            <p className="text-xs text-gray-500 font-medium">{restro?.RestroName || "Mizaz E Bhopal"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-[#2f54eb] text-white text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-sm">
            {filteredOrders.length}
          </div>
          <button className="relative w-10 h-10 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center text-gray-600">
            🔔
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* TOP SCREEN STATS */}
      <div className="p-4">
        <h2 className="text-2xl font-black text-gray-900">Orders</h2>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">Station : <span className="text-[#2f54eb] font-bold">{restro?.StationCode || "BPL"}</span></p>
      </div>

      {/* HORIZONTAL TABS CONTROLLER (ZOMATO STYLE) */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
        {["In Kitchen", "Out for Delivery", "Delivered", "Cancelled"].map((status) => {
          const isActive = activeTab === status;
          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 ${
                isActive
                  ? "bg-[#2f54eb] text-white border-[#2f54eb] shadow-md shadow-blue-100"
                  : "bg-white text-gray-600 border-gray-200/70 hover:bg-gray-50"
              }`}
            >
              {status === "In Kitchen" && "🍳 "}
              {status === "Out for Delivery" && "🛵 "}
              {status === "Delivered" && "✅ "}
              {status === "Cancelled" && "❌ "}
              {status}
            </button>
          );
        })}
      </div>

      {/* ORDERS LIST CONTAINER */}
      <main className="px-4 mt-2 space-y-4">
        {loading ? (
          <div className="py-20 text-center text-sm font-medium text-gray-400 animate-pulse">
            Loading Fresh Orders...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-base font-bold text-gray-800">No Orders Yet</h3>
            <p className="text-xs text-gray-400 mt-1">Orders in this category will appear here.</p>
          </div>
        ) : (
          filteredOrders.map((item, index) => (
            <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-4 relative">
              
              {/* Card Upper Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="bg-blue-50 text-[#2f54eb] font-bold text-[11px] px-2.5 py-1 rounded-md tracking-wide">
                  #{item.OrderId || "RE-2025112617"}
                </span>
                <span className="bg-orange-50 text-orange-600 font-bold text-[11px] px-2.5 py-1 rounded-md">
                  {item.Status || "Out for Delivery"}
                </span>
              </div>

              {/* Customer Info */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
                <div>
                  <h4 className="font-extrabold text-base text-gray-900">{item.CustomerName || "Customer Name"}</h4>
                  <p className="text-xs font-semibold text-gray-500 mt-0.5">{item.CustomerMobile || "9999999999"}</p>
                </div>
                {item.CustomerMobile && (
                  <a href={`tel:${item.CustomerMobile}`} className="w-9 h-9 bg-blue-50 hover:bg-blue-100 rounded-full flex items-center justify-center text-blue-600 transition">
                    📞
                  </a>
                )}
              </div>

              {/* Journey Details Matrix */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs border-b border-gray-100 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚂</span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium leading-none">Train</p>
                    <p className="font-bold text-gray-800 mt-0.5">{item.TrainNumber || "12716"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base">💺</span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium leading-none">Coach / Seat</p>
                    <p className="font-bold text-gray-800 mt-0.5">{item.Coach || "B4"} / {item.Seat || "99"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium leading-none">Date</p>
                    <p className="font-bold text-gray-800 mt-0.5">{item.DeliveryDate || "2026-05-23"}</p>
                  </div>
                </div>

                <div
