"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MenuPage() {
  const router = useRouter();

  const [restro, setRestro] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadMenu();
  }, []);

  async function loadMenu() {
    try {
      const stored = localStorage.getItem("restro");

      if (!stored) {
        router.push("/");
        return;
      }

      const restroData = JSON.parse(stored);
      setRestro(restroData);

      const { data, error } = await supabase
        .from("RestroMenuItems")
        .select("*")
        .eq("restro_code", restroData.RestroCode)
        .order("item_name", { ascending: true });

      if (!error && data) {
        setMenuItems(data);
      }

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  async function toggleItemStatus(item: any) {
    try {
      setUpdatingId(item.id);

      const newStatus =
        item.status?.toUpperCase() === "ON" ? "OFF" : "ON";

      const { error } = await supabase
        .from("RestroMenuItems")
        .update({
          status: newStatus,
        })
        .eq("id", item.id);

      if (error) {
        console.log(error);
        alert("Failed to update item status");
        return;
      }

      setMenuItems((prev) =>
        prev.map((menuItem) =>
          menuItem.id === item.id
            ? { ...menuItem, status: newStatus }
            : menuItem
        )
      );

      alert(
        `Item ${
          newStatus === "ON" ? "Activated" : "Deactivated"
        } Successfully`
      );
    } catch (err) {
      console.log(err);
      alert("Something went wrong");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none touch-action-none">

      {/* HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 bg-[#f4b400] rounded-xl flex items-center justify-center font-bold text-black text-xs overflow-hidden shadow-sm flex-shrink-0">
            <img
              src="/logo.png"
              alt="logo"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            RE
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-gray-900 leading-none mb-0.5">
              RailEats
            </h1>

            <p className="text-xs text-gray-500 font-semibold truncate max-w-[160px]">
              {restro?.RestroName || "Restaurant"}
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#2f54eb] text-white text-xs font-black px-2.5 py-1.5 rounded-lg min-w-[54px] text-center shadow-md shadow-blue-100">
            Code {restro?.RestroCode}
          </div>
        </div>
      </header>

      {/* TITLE */}
      <div className="bg-white flex-shrink-0 pt-3 pb-3 border-b border-gray-100 z-40 w-full px-4 flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
            Food Menu
          </h2>

          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
            Manage Menu Items
          </p>
        </div>

        <div className="bg-blue-50 text-[#2f54eb] text-[11px] font-black px-3 py-1.5 rounded-xl">
          Total: {menuItems.length} Items
        </div>

      </div>

      {/* MENU LIST */}
      <main className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4 touch-action-pan-y">

        {loading ? (
          <div className="h-full flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2">
            <span className="text-2xl animate-spin">⏳</span>
            Fetching Restaurant Menu...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center py-12 text-center">

            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col items-center w-full">

              <span className="text-5xl mb-3">🍽️</span>

              <h3 className="text-base font-black text-gray-800">
                No Items Added
              </h3>

              <p className="text-xs text-gray-400 mt-1 font-medium max-w-[220px]">
                Your menu list is empty for restro code {restro?.RestroCode}.
              </p>

            </div>

          </div>
        ) : (
          menuItems.map((item, index) => {
            const isVeg =
              item.item_category?.toLowerCase() === "veg" ||
              item.item_category?.toLowerCase() === "jain";

            const isOn = item.status?.toUpperCase() === "ON";

            return (
              <div
                key={index}
                className="bg-white rounded-3xl border border-gray-100/80 p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
              >

                {/* TOP */}
                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[8px] font-bold ${
                        isVeg
                          ? "border-green-600 bg-green-50 text-green-600"
                          : "border-red-600 bg-red-50 text-red-600"
                      }`}
                    >
                      ●
                    </span>

                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      {item.item_cuisine || "Cuisine"} •{" "}
                      {item.item_category}
                    </span>

                  </div>

                  {/* BLUE / GRAY STATUS BUTTON */}
                  <span
                    className={`font-black text-[9px] px-2 py-0.5 rounded-md ${
                      isOn
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {isOn ? "● ACTIVE (ON)" : "● DEACTIVE (OFF)"}
                  </span>

                </div>

                {/* ITEM DETAILS */}
                <div className="min-w-0">

                  <div className="flex items-start justify-between gap-2">

                    <h4 className="font-black text-base text-gray-900 leading-tight">
                      {item.item_name}
                    </h4>

                    <span className="bg-gray-50 text-gray-500 font-extrabold text-[9px] px-2 py-0.5 rounded-md flex-shrink-0">
                      Code: {item.item_code}
                    </span>

                  </div>

                  {item.item_description && (
                    <p className="text-xs font-medium text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.item_description}
                    </p>
                  )}

                </div>

                {/* TIME + GST */}
                <div className="grid grid-cols-2 gap-2 bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100 text-[11px] font-bold text-gray-500">

                  <div className="flex items-center gap-1.5">

                    <span>🕒 Avail:</span>

                    <span className="text-gray-700 font-extrabold truncate">
                      {item.start_time?.slice(0, 5)} -{" "}
                      {item.end_time?.slice(0, 5)}
                    </span>

                  </div>

                  <div className="flex items-center gap-1.5 justify-end">

                    <span>Tax (GST):</span>

                    <span className="text-gray-700 font-extrabold">
                      {item.gst_percent || 0}%
                    </span>

                  </div>

                </div>

                {/* PRICE */}
                <div className="flex items-center justify-between border-t border-gray-50 pt-2.5 mt-0.5">

                  <div className="flex flex-col gap-1">

                    <span className="text-[10px] text-gray-400 font-bold">
                      Base: ₹{item.base_price || 0}
                    </span>

                    <span className="text-[10px] text-orange-500 font-black">
                      Restro: ₹{item.restro_price || 0}
                    </span>

                  </div>

                  <div className="text-right">

                    <span className="text-[10px] text-gray-400 font-bold block leading-none">
                      Selling Price
                    </span>

                    <span className="text-base font-black text-gray-900 mt-0.5 block">
                      ₹{item.selling_price || item.restro_price || 0}
                    </span>

                  </div>

                </div>

                {/* ACTIVE / DEACTIVE BUTTON */}
                <button
                  onClick={() => toggleItemStatus(item)}
                  disabled={updatingId === item.id}
                  className={`w-full h-10 rounded-xl text-xs font-black transition-all ${
                    isOn
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : "bg-green-50 text-green-600 border border-green-100"
                  }`}
                >
                  {updatingId === item.id
                    ? "UPDATING..."
                    : isOn
                    ? "DEACTIVATE ITEM"
                    : "ACTIVATE ITEM"}
                </button>

              </div>
            );
          })
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe">

        <button
          onClick={() => router.push("/orders")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">📋</span>

          <span className="text-[10px] font-bold mt-1 tracking-tight">
            Orders
          </span>
        </button>

        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-xl">🍽️</span>

          <span className="text-[10px] font-black mt-1 tracking-tight">
            Menu
          </span>
        </button>

        <button
          onClick={() => router.push("/delivery-settings")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>

          <span className="text-[10px] font-bold mt-1 tracking-tight">
            Settings
          </span>
        </button>

        <button
          onClick={() => router.push("/profile")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">👤</span>

          <span className="text-[10px] font-bold mt-1 tracking-tight">
            Profile
          </span>
        </button>

      </nav>

    </div>
  );
}
