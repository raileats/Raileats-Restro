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
  const [activeTab, setActiveTab] =
    useState("In Kitchen");
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {

    try {

      const stored =
        localStorage.getItem("restro");

      if (!stored) {
        router.push("/");
        return;
      }

      const restroData =
        JSON.parse(stored);

      setRestro(restroData);

      const { data, error } =
        await supabase
          .from("Orders")
          .select("*")
          .eq(
            "RestroCode",
            restroData.RestroCode
          )
          .order("CreatedAt", {
            ascending: false,
          });

      console.log(data);
      console.log(error);

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

  const filteredOrders =
    orders.filter((item) => {

      const status =
        item.Status
          ?.toLowerCase()
          .trim();

      if (
        activeTab ===
          "In Kitchen" &&
        status === "inkitchen"
      ) {
        return true;
      }

      if (
        activeTab ===
          "Out for Delivery" &&
        status ===
          "outfordelivery"
      ) {
        return true;
      }

      if (
        activeTab ===
          "Delivered" &&
        status === "delivered"
      ) {
        return true;
      }

      if (
        activeTab ===
          "Cancelled" &&
        status === "cancelled"
      ) {
        return true;
      }

      if (
        activeTab ===
          "Not Delivered" &&
        status ===
          "notdelivered"
      ) {
        return true;
      }

      if (
        activeTab ===
          "Bad Delivery" &&
        status ===
          "baddelivery"
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

    <div className="min-h-screen bg-[#f4f6fb]">

      {/* MOBILE HEADER */}

      <div className="lg:hidden sticky top-0 z-50 bg-white border-b">

        <div className="px-4 py-3 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <img
              src="/logo.png"
              alt="logo"
              className="w-11 h-11 rounded-xl"
            />

            <div>

              <h1 className="text-[20px] font-bold leading-none">
                RailEats
              </h1>

              <p className="text-gray-500 text-sm mt-1">
                Restro Panel
              </p>

            </div>
          </div>

          <div className="bg-[#2f54eb] text-white px-4 py-3 rounded-2xl font-bold text-lg shadow">

            {restro?.RestroCode}

          </div>
        </div>
      </div>

      <div className="flex">

        {/* DESKTOP SIDEBAR */}

        <div className="hidden lg:flex w-[280px] bg-white border-r min-h-screen flex-col">

          {/* HEADER */}

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

          {/* MENU */}

          <div className="p-4 flex flex-col gap-3">

            <button className="bg-[#2f54eb] text-white h-[54px] rounded-2xl text-left px-5 font-semibold text-[18px]">

              Orders

            </button>

            <button
              onClick={() =>
                router.push("/profile")
              }
              className="h-[54px] rounded-2xl text-left px-5 hover:bg-gray-100 text-[18px]"
            >

              Restro Profile

            </button>

            <button
              onClick={() =>
                router.push(
                  "/delivery-settings"
                )
              }
              className="h-[54px] rounded-2xl text-left px-5 hover:bg-gray-100 text-[18px]"
            >

              Delivery Settings

            </button>

            <button
              onClick={logout}
              className="h-[54px] rounded-2xl text-left px-5 hover:bg-red-50 text-red-500 text-[18px]"
            >

              Logout

            </button>

          </div>
        </div>

        {/* MAIN */}

        <div className="flex-1">

          {/* DESKTOP HEADER */}

          <div className="hidden lg:flex items-start justify-between p-10 pb-0">

            <div>

              <h1 className="text-5xl font-bold">
                Orders
              </h1>

              <p className="text-gray-600 mt-4 text-2xl">
                Welcome{" "}
                {restro?.RestroName}
              </p>

              <p className="text-gray-500 text-lg mt-1">
                Station Code :{" "}
                {restro?.StationCode}
              </p>

            </div>

            <div className="bg-white border rounded-3xl px-8 py-5 shadow-sm text-center">

              <div className="text-gray-500 text-sm">
                Restro Code
              </div>

              <div className="text-4xl font-bold mt-1">
                {restro?.RestroCode}
              </div>

            </div>
          </div>

          {/* MOBILE TOP */}

          <div className="lg:hidden px-4 pt-5">

            <h1 className="text-[52px] font-bold leading-none">
              Orders
            </h1>

            <p className="text-gray-700 text-[18px] mt-5 font-medium">
              {restro?.RestroName}
            </p>

            <p className="text-gray-500 text-[16px] mt-1">
              Station :{" "}
              {restro?.StationCode}
            </p>
          </div>

          {/* TABS */}

          <div className="px-4 lg:px-10 mt-6">

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">

              {tabs.map((status) => (

                <button
                  key={status}
                  onClick={() =>
                    setActiveTab(status)
                  }
                  className={`flex-shrink-0 px-6 py-4 rounded-2xl font-semibold transition text-[16px] ${
                    activeTab === status
                      ? "bg-[#2f54eb] text-white"
                      : "bg-white border border-black/20"
                  }`}
                >

                  {status}

                </button>
              ))}
            </div>
          </div>

          {/* CONTENT */}

          <div className="px-4 lg:px-10 py-6">

            {loading ? (

              <div className="bg-white rounded-3xl p-16 text-center shadow-sm">

                <div className="text-2xl font-semibold">
                  Loading...
                </div>

              </div>

            ) : filteredOrders.length ===
              0 ? (

              <div className="bg-white rounded-3xl p-10 lg:p-20 text-center shadow-sm overflow-hidden">

                <h2 className="text-3xl lg:text-5xl font-bold mb-4">
                  No Orders Yet
                </h2>

                <p className="text-gray-500 text-lg">
                  Orders for this restro
                  will appear here.
                </p>

              </div>

            ) : (

              <>
                {/* MOBILE CARDS */}

                <div className="lg:hidden flex flex-col gap-4">

                  {filteredOrders.map(
                    (item, index) => (

                      <div
                        key={index}
                        className="bg-white rounded-3xl p-5 shadow-sm"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <h2 className="font-bold text-[17px] break-all">
                              {
                                item.OrderId
                              }
                            </h2>

                            <p className="text-gray-500 text-sm mt-1">
                              {
                                item.RestroName
                              }
                            </p>
                          </div>

                          <span className="bg-[#2f54eb] text-white px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap">

                            {item.Status}

                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-5">

                          <div>

                            <p className="text-gray-500 text-sm">
                              Train
                            </p>

                            <p className="font-semibold">
                              {
                                item.TrainNumber
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-gray-500 text-sm">
                              Coach
                            </p>

                            <p className="font-semibold">
                              {item.Coach}
                            </p>

                          </div>

                          <div>

                            <p className="text-gray-500 text-sm">
                              Seat
                            </p>

                            <p className="font-semibold">
                              {item.Seat}
                            </p>

                          </div>

                          <div>

                            <p className="text-gray-500 text-sm">
                              Mobile
                            </p>

                            <p className="font-semibold">
                              {
                                item.CustomerMobile
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-gray-500 text-sm">
                              Date
                            </p>

                            <p className="font-semibold">
                              {
                                item.DeliveryDate
                              }
                            </p>

                          </div>

                          <div>

                            <p className="text-gray-500 text-sm">
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

                          <p className="font-semibold mt-1">
                            {
                              item.CustomerName
                            }
                          </p>

                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* DESKTOP TABLE */}

                <div className="hidden lg:block bg-white rounded-2xl shadow-sm border overflow-auto">

                  <table className="w-full">

                    <thead className="bg-gray-50 border-b">

                      <tr className="text-left">

                        <th className="p-5">
                          Order ID
                        </th>

                        <th className="p-5">
                          Outlet
                        </th>

                        <th className="p-5">
                          Train
                        </th>

                        <th className="p-5">
                          Coach
                        </th>

                        <th className="p-5">
                          Seat
                        </th>

                        <th className="p-5">
                          Customer
                        </th>

                        <th className="p-5">
                          Mobile
                        </th>

                        <th className="p-5">
                          Date
                        </th>

                        <th className="p-5">
                          Time
                        </th>

                        <th className="p-5">
                          Status
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {filteredOrders.map(
                        (item, index) => (

                          <tr
                            key={index}
                            className="border-b hover:bg-gray-50"
                          >

                            <td className="p-5 font-medium">
                              {
                                item.OrderId
                              }
                            </td>

                            <td className="p-5">
                              {
                                item.RestroName
                              }
                            </td>

                            <td className="p-5">
                              {
                                item.TrainNumber
                              }
                            </td>

                            <td className="p-5">
                              {item.Coach}
                            </td>

                            <td className="p-5">
                              {item.Seat}
                            </td>

                            <td className="p-5">
                              {
                                item.CustomerName
                              }
                            </td>

                            <td className="p-5">
                              {
                                item.CustomerMobile
                              }
                            </td>

                            <td className="p-5">
                              {
                                item.DeliveryDate
                              }
                            </td>

                            <td className="p-5">
                              {
                                item.DeliveryTime
                              }
                            </td>

                            <td className="p-5">

                              <span className="bg-[#2f54eb] text-white px-4 py-2 rounded-lg text-sm">

                                {item.Status}

                              </span>

                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50">

        <div className="grid grid-cols-4">

          <button className="py-4 text-[#2f54eb] font-semibold text-sm">
            Orders
          </button>

          <button
            onClick={() =>
              router.push("/profile")
            }
            className="py-4 text-gray-500 text-sm"
          >
            Profile
          </button>

          <button
            onClick={() =>
              router.push(
                "/delivery-settings"
              )
            }
            className="py-4 text-gray-500 text-sm"
          >
            Settings
          </button>

          <button
            onClick={logout}
            className="py-4 text-red-500 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
