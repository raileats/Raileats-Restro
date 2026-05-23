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
  const [activeTab, setActiveTab] = useState("In Kitchen");
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

  const filteredOrders = orders.filter((item) => {

    const status = item.Status?.toLowerCase().trim();

    if (
      activeTab === "In Kitchen" &&
      (status === "inkitchen" || status === "inkitchen")
    ) {
      return true;
    }

    if (
      activeTab === "Out for Delivery" &&
      status === "outfordelivery"
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
      status === "notdelivered"
    ) {
      return true;
    }

    if (
      activeTab === "Bad Delivery" &&
      status === "baddelivery"
    ) {
      return true;
    }

    return false;
  });

  const tabs = [
    "In Kitchen",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Not Delivered",
    "Bad Delivery",
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fb] pb-[90px] md:pb-0">

      {/* MOBILE HEADER */}

      <div className="md:hidden bg-white px-4 py-4 shadow-sm sticky top-0 z-50">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <img
              src="/logo.png"
              className="w-12 h-12 rounded-xl"
            />

            <div>

              <h1 className="text-[28px] font-bold leading-none">
                RailEats
              </h1>

              <p className="text-gray-500 text-sm mt-1">
                {restro?.RestroName}
              </p>

            </div>
          </div>

          <div className="bg-[#2f54eb] text-white w-[62px] h-[62px] rounded-2xl flex flex-col items-center justify-center shadow-lg">

            <div className="text-[10px] opacity-80">
              Code
            </div>

            <div className="text-xl font-bold">
              {restro?.RestroCode}
            </div>

          </div>
        </div>
      </div>

      <div className="flex">

        {/* DESKTOP SIDEBAR */}

        <div className="hidden md:block w-[280px] bg-white border-r min-h-screen">

          <div className="h-[92px] border-b flex items-center px-6 gap-4">

            <img
              src="/logo.png"
              alt="logo"
              className="w-[52px] h-[52px]"
            />

            <div>

              <h1 className="text-[32px] font-bold leading-none">
                RailEats
              </h1>

              <p className="text-gray-500">
                Restro Panel
              </p>

            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">

            <button className="bg-[#2f54eb] text-white h-[54px] rounded-xl text-left px-5 font-semibold text-[18px]">
              Orders
            </button>

            <button
              onClick={() => router.push("/delivery-settings")}
              className="h-[54px] rounded-xl text-left px-5 hover:bg-gray-100 text-[18px]"
            >
              Delivery Settings
            </button>

            <button
              onClick={() => router.push("/profile")}
              className="h-[54px] rounded-xl text-left px-5 hover:bg-gray-100 text-[18px]"
            >
              Restro Profile
            </button>

            <button
              onClick={logout}
              className="h-[54px] rounded-xl text-left px-5 hover:bg-red-50 text-red-500 text-[18px]"
            >
              Logout
            </button>

          </div>
        </div>

        {/* MAIN */}

        <div className="flex-1 px-4 md:px-10 py-5 md:py-10">

          {/* DESKTOP TOP */}

          <div className="hidden md:flex items-start justify-between mb-10">

            <div>

              <h1 className="text-5xl font-bold">
                Orders
              </h1>

              <p className="text-gray-500 mt-4 text-xl">
                Welcome {restro?.RestroName}
              </p>

              <p className="text-gray-500 text-lg mt-1">
                Station Code : {restro?.StationCode}
              </p>

            </div>

            <div className="bg-white border rounded-3xl px-8 py-5 shadow-sm">

              <div className="text-gray-500 text-sm">
                Restro Code
              </div>

              <div className="text-3xl font-bold">
                {restro?.RestroCode}
              </div>

            </div>
          </div>

          {/* MOBILE INFO */}

          <div className="md:hidden mb-5">

            <p className="text-gray-700 text-[34px] leading-tight font-bold">
              {restro?.RestroName}
            </p>

            <p className="text-gray-500 text-[22px] mt-2">
              Station : {restro?.StationCode}
            </p>

          </div>

          {/* TABS */}

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mb-6">

            {tabs.map((status) => (

              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`shrink-0 px-5 md:px-7 py-3 md:py-4 rounded-2xl font-semibold text-sm md:text-base transition-all ${
                  activeTab === status
                    ? "bg-[#2f54eb] text-white shadow-lg"
                    : "bg-white border text-black"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* LOADING */}

          {loading ? (

            <div className="bg-white rounded-3xl p-20 text-center text-2xl shadow-sm">
              Loading...
            </div>

          ) : filteredOrders.length === 0 ? (

            <div className="bg-white rounded-3xl p-16 md:p-20 text-center shadow-sm">

              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                No Orders Yet
              </h2>

              <p className="text-gray-500 text-lg">
                Orders for this restro will appear here.
              </p>

            </div>

          ) : (

            <>
              {/* MOBILE CARDS */}

              <div className="md:hidden flex flex-col gap-5">

                {filteredOrders.map((item, index) => (

                  <div
                    key={index}
                    className="bg-white rounded-[30px] p-5 shadow-sm"
                  >

                    <div className="flex items-start justify-between mb-5">

                      <div className="bg-[#eef2ff] text-[#2f54eb] px-4 py-2 rounded-2xl text-sm font-semibold max-w-[65%] break-words">
                        #{item.OrderId}
                      </div>

                      <div className="bg-orange-100 text-orange-500 px-4 py-2 rounded-2xl text-sm font-semibold">
                        {item.Status}
                      </div>
                    </div>

                    <h2 className="text-[34px] leading-tight font-bold text-black">
                      {item.CustomerName || "Guest"}
                    </h2>

                    <p className="text-gray-500 text-[22px] mt-2">
                      {item.CustomerMobile}
                    </p>

                    <div className="grid grid-cols-2 gap-y-7 mt-8">

                      <div>
                        <p className="text-gray-400 text-lg">
                          Train
                        </p>

                        <h3 className="text-[30px] font-bold mt-1">
                          {item.TrainNumber}
                        </h3>
                      </div>

                      <div>
                        <p className="text-gray-400 text-lg">
                          Coach / Seat
                        </p>

                        <h3 className="text-[30px] font-bold mt-1">
                          {item.Coach} / {item.Seat}
                        </h3>
                      </div>

                      <div>
                        <p className="text-gray-400 text-lg">
                          Date
                        </p>

                        <h3 className="text-[26px] font-bold mt-1">
                          {item.DeliveryDate}
                        </h3>
                      </div>

                      <div>
                        <p className="text-gray-400 text-lg">
                          Time
                        </p>

                        <h3 className="text-[26px] font-bold mt-1">
                          {item.DeliveryTime}
                        </h3>
                      </div>
                    </div>

                    <div className="border-t mt-8 pt-5 flex items-center justify-between">

                      <div>
                        <p className="text-gray-400 text-lg">
                          Outlet
                        </p>

                        <h3 className="text-[28px] font-bold mt-1">
                          {item.RestroName}
                        </h3>
                      </div>

                      <button className="bg-[#eef2ff] text-[#2f54eb] px-5 py-3 rounded-2xl font-semibold">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}

              <div className="hidden md:block bg-white rounded-3xl shadow-sm border overflow-auto">

                <table className="w-full">

                  <thead className="bg-gray-50 border-b">

                    <tr className="text-left">

                      <th className="p-5">Order ID</th>
                      <th className="p-5">Outlet</th>
                      <th className="p-5">Train</th>
                      <th className="p-5">Coach</th>
                      <th className="p-5">Seat</th>
                      <th className="p-5">Customer</th>
                      <th className="p-5">Mobile</th>
                      <th className="p-5">Date</th>
                      <th className="p-5">Time</th>
                      <th className="p-5">Status</th>

                    </tr>
                  </thead>

                  <tbody>

                    {filteredOrders.map((item, index) => (

                      <tr
                        key={index}
                        className="border-b hover:bg-gray-50"
                      >

                        <td className="p-5 font-medium">
                          {item.OrderId}
                        </td>

                        <td className="p-5">
                          {item.RestroName}
                        </td>

                        <td className="p-5">
                          {item.TrainNumber}
                        </td>

                        <td className="p-5">
                          {item.Coach}
                        </td>

                        <td className="p-5">
                          {item.Seat}
                        </td>

                        <td className="p-5">
                          {item.CustomerName}
                        </td>

                        <td className="p-5">
                          {item.CustomerMobile}
                        </td>

                        <td className="p-5">
                          {item.DeliveryDate}
                        </td>

                        <td className="p-5">
                          {item.DeliveryTime}
                        </td>

                        <td className="p-5">

                          <span className="bg-[#2f54eb] text-white px-4 py-2 rounded-xl text-sm">
                            {item.Status}
                          </span>

                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t h-[84px] flex items-center justify-around z-50 shadow-[0_-2px_20px_rgba(0,0,0,0.06)]">

        {/* ORDERS */}

        <button className="flex flex-col items-center text-[#2f54eb] font-semibold">

          <span className="text-[24px]">
            📦
          </span>

          <span className="text-[13px] mt-1">
            Orders
          </span>

        </button>

        {/* DELIVERY */}

        <button
          onClick={() => router.push("/delivery-settings")}
          className="flex flex-col items-center text-gray-700"
        >

          <span className="text-[24px]">
            ⚙️
          </span>

          <span className="text-[13px] mt-1">
            Delivery
          </span>

        </button>

        {/* PROFILE */}

        <button
          onClick={() => router.push("/profile")}
          className="flex flex-col items-center text-gray-700"
        >

          <span className="text-[24px]">
            👤
          </span>

          <span className="text-[13px] mt-1">
            Profile
          </span>

        </button>

      </div>
    </div>
  );
}
