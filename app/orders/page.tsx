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

  const tabs = [
    "In Kitchen",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Not Delivered",
    "Bad Delivery",
  ];

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
    const status = item.Status?.toLowerCase().replace(/\s/g, "");

    if (
      activeTab === "In Kitchen" &&
      status === "inkitchen"
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

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex">

      {/* SIDEBAR */}

      <div className="hidden lg:flex w-[290px] bg-white border-r min-h-screen flex-col">

        {/* LOGO */}

        <div className="h-[95px] border-b flex items-center px-6 gap-4">

          <img
            src="/logo.png"
            alt="logo"
            className="w-[54px] h-[54px]"
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

        {/* MENU */}

        <div className="p-4 flex flex-col gap-3">

          <button className="bg-[#2f54eb] text-white h-[56px] rounded-2xl text-left px-5 font-semibold text-[18px]">
            Orders
          </button>

          <button
            onClick={() => router.push("/profile")}
            className="h-[56px] rounded-2xl text-left px-5 hover:bg-gray-100 text-[18px]"
          >
            Restro Profile
          </button>

          <button
            onClick={() => router.push("/delivery-settings")}
            className="h-[56px] rounded-2xl text-left px-5 hover:bg-gray-100 text-[18px]"
          >
            Delivery Settings
          </button>

          <button
            onClick={logout}
            className="h-[56px] rounded-2xl text-left px-5 hover:bg-red-50 text-red-500 text-[18px]"
          >
            Logout
          </button>
        </div>
      </div>

      {/* MAIN */}

      <div className="flex-1">

       {/* MOBILE UI */}

<div className="lg:hidden">

  {/* TOP BAR */}

  <div className="sticky top-0 z-40 bg-white border-b px-4 py-4">

    <div className="flex items-center justify-between">

      <div className="flex items-center gap-3">

        <img
          src="/logo.png"
          className="w-11 h-11 rounded-xl"
        />

        <div>

          <h2 className="text-[20px] font-bold leading-none">
            RailEats
          </h2>

          <p className="text-[13px] text-gray-500 mt-1">
            {restro?.RestroName}
          </p>
        </div>
      </div>

      <div className="bg-[#2f54eb] text-white px-4 py-2 rounded-2xl font-bold text-[18px] shadow">
        {orders.length}
      </div>
    </div>
  </div>

  {/* PAGE */}

  <div className="px-4 pt-5 pb-[110px]">

    {/* TITLE */}

    <div className="mb-5">

      <h1 className="text-[34px] font-bold leading-none">
        Orders
      </h1>

      <p className="text-gray-500 mt-2 text-[15px]">
        Station : {restro?.StationCode}
      </p>
    </div>

    {/* STATUS TABS */}

    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar mb-5">

      {tabs.map((status) => (

        <button
          key={status}
          onClick={() => setActiveTab(status)}
          className={`min-w-fit px-5 h-[48px] rounded-2xl text-[14px] font-semibold whitespace-nowrap transition-all ${
            activeTab === status
              ? "bg-[#2f54eb] text-white shadow"
              : "bg-white border border-gray-200"
          }`}
        >
          {status}
        </button>
      ))}
    </div>

    {/* LOADING */}

    {loading ? (

      <div className="bg-white rounded-[28px] p-10 text-center shadow-sm">

        <h2 className="text-2xl font-bold">
          Loading...
        </h2>

      </div>

    ) : filteredOrders.length === 0 ? (

      <div className="bg-white rounded-[28px] p-10 text-center shadow-sm">

        <h2 className="text-3xl font-bold">
          No Orders
        </h2>

        <p className="text-gray-500 mt-3">
          Orders will appear here
        </p>

      </div>

    ) : (

      <div className="space-y-4">

        {filteredOrders.map((order, index) => (

          <div
            key={index}
            className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100"
          >

            {/* TOP */}

            <div className="flex items-start justify-between gap-4">

              <div className="min-w-0">

                <h2 className="text-[19px] font-bold leading-tight break-words">
                  {order.CustomerName || "Guest"}
                </h2>

                <p className="text-gray-500 text-[14px] mt-1">
                  {order.CustomerMobile}
                </p>
              </div>

              <div className="bg-[#eef2ff] text-[#2f54eb] px-3 py-2 rounded-xl text-[12px] font-bold max-w-[130px] break-words text-right">
                #{order.OrderId}
              </div>
            </div>

            {/* MIDDLE */}

            <div className="grid grid-cols-2 gap-y-5 mt-6">

              <div>

                <p className="text-gray-400 text-[13px]">
                  Train
                </p>

                <p className="font-bold text-[18px] mt-1">
                  {order.TrainNumber}
                </p>
              </div>

              <div>

                <p className="text-gray-400 text-[13px]">
                  Coach / Seat
                </p>

                <p className="font-bold text-[18px] mt-1">
                  {order.Coach || "-"} / {order.Seat || "-"}
                </p>
              </div>

              <div>

                <p className="text-gray-400 text-[13px]">
                  Delivery Date
                </p>

                <p className="font-semibold text-[16px] mt-1">
                  {order.DeliveryDate}
                </p>
              </div>

              <div>

                <p className="text-gray-400 text-[13px]">
                  Time
                </p>

                <p className="font-semibold text-[16px] mt-1">
                  {order.DeliveryTime}
                </p>
              </div>
            </div>

            {/* BOTTOM */}

            <div className="flex items-center justify-between mt-6">

              <div className="bg-[#2f54eb] text-white px-4 py-2 rounded-xl text-[13px] font-semibold capitalize">
                {order.Status}
              </div>

              <div className="text-[13px] text-gray-500">
                {order.RestroName}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* BOTTOM NAV */}

  <div className="fixed bottom-0 left-0 right-0 bg-white border-t h-[72px] flex items-center justify-around z-50">

    <button className="flex flex-col items-center text-[#2f54eb] font-semibold text-[13px]">
      <span className="text-[22px]">📦</span>
      Orders
    </button>

    <button
      onClick={() => router.push("/profile")}
      className="flex flex-col items-center text-gray-500 text-[13px]"
    >
      <span className="text-[22px]">👤</span>
      Profile
    </button>

    <button
      onClick={() => router.push("/delivery-settings")}
      className="flex flex-col items-center text-gray-500 text-[13px]"
    >
      <span className="text-[22px]">⚙️</span>
      Settings
    </button>

    <button
      onClick={logout}
      className="flex flex-col items-center text-red-500 text-[13px]"
    >
      <span className="text-[22px]">↩️</span>
      Logout
    </button>
  </div>
</div>

        {/* DESKTOP HEADER */}

        <div className="hidden lg:flex items-start justify-between p-10 pb-4">

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

        {/* STATUS TABS */}

        <div className="px-4 lg:px-10 mt-6">

          {/* MOBILE */}

          <div className="lg:hidden">

            <div className="flex items-center gap-3">

              <button
                onClick={() => {
                  const currentIndex = tabs.indexOf(activeTab);

                  const newIndex =
                    currentIndex === 0
                      ? tabs.length - 1
                      : currentIndex - 1;

                  setActiveTab(tabs[newIndex]);
                }}
                className="min-w-[48px] h-[48px] rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[22px] font-bold"
              >
                {"<"}
              </button>

              <div className="flex-1 grid grid-cols-3 gap-2">

                {tabs
                  .slice(
                    Math.max(
                      0,
                      Math.min(
                        tabs.indexOf(activeTab) - 1,
                        tabs.length - 3
                      )
                    ),
                    Math.max(
                      0,
                      Math.min(
                        tabs.indexOf(activeTab) - 1,
                        tabs.length - 3
                      )
                    ) + 3
                  )
                  .map((status) => (

                    <button
                      key={status}
                      onClick={() => setActiveTab(status)}
                      className={`h-[54px] rounded-2xl px-2 text-[13px] leading-tight font-semibold transition-all ${
                        activeTab === status
                          ? "bg-[#2f54eb] text-white shadow-md"
                          : "bg-white border border-gray-200 text-black"
                      }`}
                    >
                      <span className="line-clamp-2">
                        {status}
                      </span>
                    </button>
                  ))}
              </div>

              <button
                onClick={() => {
                  const currentIndex = tabs.indexOf(activeTab);

                  const newIndex =
                    currentIndex === tabs.length - 1
                      ? 0
                      : currentIndex + 1;

                  setActiveTab(tabs[newIndex]);
                }}
                className="min-w-[48px] h-[48px] rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-center text-[22px] font-bold"
              >
                {">"}
              </button>
            </div>
          </div>

          {/* DESKTOP */}

          <div className="hidden lg:flex flex-wrap gap-4">

            {tabs.map((status) => (

              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-7 py-4 rounded-2xl text-[16px] font-semibold transition-all ${
                  activeTab === status
                    ? "bg-[#2f54eb] text-white shadow"
                    : "bg-white border border-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}

        <div className="p-4 lg:p-10">

          {loading ? (

            <div className="bg-white rounded-[30px] p-16 text-center shadow-sm border">

              <h2 className="text-3xl font-bold">
                Loading Orders...
              </h2>

            </div>

          ) : filteredOrders.length === 0 ? (

            <div className="bg-white rounded-[30px] p-16 text-center shadow-sm border">

              <h2 className="text-4xl font-bold mb-4">
                No Orders Yet
              </h2>

              <p className="text-gray-500 text-lg">
                Orders will appear here.
              </p>

            </div>

          ) : (

            <>
              {/* MOBILE CARDS */}

              <div className="lg:hidden space-y-5">

                {filteredOrders.map((order, index) => (

                  <div
                    key={index}
                    className="bg-white rounded-[28px] p-5 shadow-sm border border-gray-100"
                  >

                    {/* TOP */}

                    <div className="flex items-start justify-between gap-3">

                      <div className="min-w-0">

                        <h2 className="font-bold text-[18px] break-words">
                          {order.CustomerName}
                        </h2>

                        <p className="text-gray-500 text-[14px] mt-1 break-all">
                          {order.CustomerMobile}
                        </p>
                      </div>

                      <span className="bg-[#2f54eb] text-white px-3 py-2 rounded-xl text-[12px] font-semibold">
                        #{order.OrderId}
                      </span>
                    </div>

                    {/* DETAILS */}

                    <div className="grid grid-cols-2 gap-y-5 gap-x-3 mt-6">

                      <div>

                        <p className="text-gray-500 text-[13px]">
                          Train
                        </p>

                        <p className="font-semibold text-[16px] mt-1">
                          {order.TrainNumber}
                        </p>
                      </div>

                      <div>

                        <p className="text-gray-500 text-[13px]">
                          Coach / Seat
                        </p>

                        <p className="font-semibold text-[16px] mt-1">
                          {order.Coach} / {order.Seat}
                        </p>
                      </div>

                      <div>

                        <p className="text-gray-500 text-[13px]">
                          Date
                        </p>

                        <p className="font-semibold text-[16px] mt-1">
                          {order.DeliveryDate}
                        </p>
                      </div>

                      <div>

                        <p className="text-gray-500 text-[13px]">
                          Time
                        </p>

                        <p className="font-semibold text-[16px] mt-1">
                          {order.DeliveryTime}
                        </p>
                      </div>
                    </div>

                    {/* STATUS */}

                    <div className="mt-6">

                      <span className="bg-[#2f54eb] text-white px-5 py-3 rounded-xl text-[14px] font-semibold inline-block">
                        {order.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE */}

              <div className="hidden lg:block bg-white rounded-3xl shadow-sm border overflow-auto">

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

                          <span className="bg-[#2f54eb] text-white px-4 py-2 rounded-lg text-sm">
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
    </div>
  );
}
