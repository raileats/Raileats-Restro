"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function OrdersPage() {
  const [restro, setRestro] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] =
    useState("In Kitchen");

  useEffect(() => {
    const storedRestro =
      localStorage.getItem("restro");

    if (!storedRestro) {
      window.location.href = "/";
      return;
    }

    const parsed = JSON.parse(storedRestro);

    setRestro(parsed);

    fetchOrders(parsed.RestroCode);
  }, []);

  const fetchOrders = async (
    restroCode: number
  ) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("Orders")
      .select("*")
      .eq("OutletID", restroCode)
      .order("created_at", {
        ascending: false,
      });

    if (!error && data) {
      setOrders(data);
    }

    setLoading(false);
  };

  const filteredOrders = orders.filter(
    (item) => {
      const status = item.Status
        ?.toLowerCase()
        .trim();

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
    }
  );

  const tabs = [
    "In Kitchen",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Not Delivered",
    "Bad Delivery",
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb]">

      {/* MOBILE HEADER */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b px-4 py-3 flex items-center justify-between">

        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            className="w-10 h-10"
          />

          <div>
            <h1 className="font-bold text-lg leading-none">
              RailEats
            </h1>

            <p className="text-xs text-gray-500">
              Restro Panel
            </p>
          </div>
        </div>

        <div className="bg-[#2f54eb] text-white px-3 py-2 rounded-xl text-sm font-semibold">
          {restro?.RestroCode}
        </div>
      </div>

      <div className="flex">

        {/* SIDEBAR */}
        <div className="hidden lg:flex w-[250px] min-h-screen bg-white border-r flex-col">

          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                className="w-12 h-12"
              />

              <div>
                <h1 className="text-3xl font-bold">
                  RailEats
                </h1>

                <p className="text-gray-500">
                  Restro Panel
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">

            <Link
              href="/orders"
              className="bg-[#2f54eb] text-white px-5 py-4 rounded-2xl font-semibold"
            >
              Orders
            </Link>

            <Link
              href="/profile"
              className="px-5 py-4 rounded-2xl hover:bg-gray-100 font-medium"
            >
              Restro Profile
            </Link>

            <Link
              href="/delivery-settings"
              className="px-5 py-4 rounded-2xl hover:bg-gray-100 font-medium"
            >
              Delivery Settings
            </Link>

            <button
              onClick={() => {
                localStorage.removeItem(
                  "restro"
                );

                window.location.href = "/";
              }}
              className="text-left px-5 py-4 text-red-600 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1">

          {/* DESKTOP HEADER */}
          <div className="hidden lg:flex items-center justify-between px-10 py-8">

            <div>
              <h1 className="text-5xl font-bold">
                Orders
              </h1>

              <p className="text-2xl text-gray-600 mt-4">
                Welcome{" "}
                {restro?.RestroName}
              </p>

              <p className="text-lg text-gray-500 mt-1">
                Station Code :{" "}
                {restro?.StationCode}
              </p>
            </div>

            <div className="bg-white border rounded-3xl px-8 py-5 text-center shadow-sm">
              <p className="text-gray-500">
                Restro Code
              </p>

              <h2 className="text-5xl font-bold">
                {restro?.RestroCode}
              </h2>
            </div>
          </div>

          {/* MOBILE INFO */}
          <div className="lg:hidden px-4 pt-4">

            <h1 className="text-3xl font-bold">
              Orders
            </h1>

            <p className="text-lg text-gray-600 mt-2">
              {restro?.RestroName}
            </p>

            <p className="text-sm text-gray-500">
              Station :{" "}
              {restro?.StationCode}
            </p>
          </div>

          {/* TABS */}
          <div className="px-4 lg:px-10 mt-5">

            <div className="flex gap-3 overflow-x-auto pb-2">

              {tabs.map((tab) => (

                <button
                  key={tab}
                  onClick={() =>
                    setActiveTab(tab)
                  }
                  className={`whitespace-nowrap px-5 py-3 rounded-2xl border font-semibold transition ${
                    activeTab === tab
                      ? "bg-[#2f54eb] text-white border-[#2f54eb]"
                      : "bg-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS */}
          <div className="px-4 lg:px-10 py-6">

            {loading ? (

              <div className="bg-white rounded-3xl p-20 text-center shadow-sm">
                Loading...
              </div>

            ) : filteredOrders.length ===
              0 ? (

              <div className="bg-white rounded-3xl p-16 text-center shadow-sm">

                <h2 className="text-3xl font-bold">
                  No Orders Yet
                </h2>

                <p className="text-gray-500 mt-3">
                  Orders for this restro
                  will appear here.
                </p>
              </div>

            ) : (

              <div className="flex flex-col gap-4">

                {filteredOrders.map(
                  (item, index) => (

                    <div
                      key={index}
                      className="bg-white rounded-3xl p-5 shadow-sm"
                    >

                      <div className="flex items-start justify-between">

                        <div>

                          <h2 className="font-bold text-lg">
                            {
                              item.OrderID
                            }
                          </h2>

                          <p className="text-gray-500 text-sm mt-1">
                            {
                              item.OutletName
                            }
                          </p>
                        </div>

                        <span className="bg-[#2f54eb] text-white text-xs px-4 py-2 rounded-xl">
                          {item.Status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-5 text-sm">

                        <div>
                          <p className="text-gray-500">
                            Train
                          </p>

                          <p className="font-semibold">
                            {
                              item.TrainNo
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Coach
                          </p>

                          <p className="font-semibold">
                            {item.Coach}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Seat
                          </p>

                          <p className="font-semibold">
                            {item.Seat}
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Mobile
                          </p>

                          <p className="font-semibold">
                            {
                              item.CustomerMobile
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Date
                          </p>

                          <p className="font-semibold">
                            {
                              item.DeliveryDate
                            }
                          </p>
                        </div>

                        <div>
                          <p className="text-gray-500">
                            Time
                          </p>

                          <p className="font-semibold">
                            {
                              item.DeliveryTime
                            }
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-4 border-t">

                        <p className="text-gray-500 text-sm">
                          Customer
                        </p>

                        <p className="font-semibold">
                          {
                            item.CustomerName
                          }
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM MENU */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 z-50">

        <Link
          href="/orders"
          className="text-[#2f54eb] font-semibold text-sm"
        >
          Orders
        </Link>

        <Link
          href="/profile"
          className="text-gray-600 text-sm"
        >
          Profile
        </Link>

        <Link
          href="/delivery-settings"
          className="text-gray-600 text-sm"
        >
          Settings
        </Link>
      </div>
    </div>
  );
}
