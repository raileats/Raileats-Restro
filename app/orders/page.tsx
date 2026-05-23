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

      // FETCH ORDERS

      const { data, error } = await supabase
        .from("Orders")
        .select("*")
        .eq("RestroCode", restroData.RestroCode)
        .order("CreatedAt", { ascending: false });

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

  // FILTER ORDERS

  const filteredOrders = orders.filter((item) => {

    const status = item.Status;

    // BOOKED = IN KITCHEN

    if (
      activeTab === "In Kitchen" &&
      status === "Booked"
    ) {
      return true;
    }

    return status === activeTab;
  });

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex">

      {/* SIDEBAR */}

      <div className="w-[280px] bg-white border-r min-h-screen">

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

          <button className="bg-[#2f54eb] text-white h-[54px] rounded-xl text-left px-5 font-semibold text-[18px]">
            Orders
          </button>

          <button
            onClick={() => router.push("/profile")}
            className="h-[54px] rounded-xl text-left px-5 hover:bg-gray-100 text-[18px]"
          >
            Restro Profile
          </button>

          <button
            onClick={() => router.push("/delivery-settings")}
            className="h-[54px] rounded-xl text-left px-5 hover:bg-gray-100 text-[18px]"
          >
            Delivery Settings
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

      <div className="flex-1 p-10">

        {/* TOP */}

        <div className="flex items-start justify-between mb-10">

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

          <div className="bg-white border rounded-2xl px-8 py-5 shadow-sm">

            <div className="text-gray-500 text-sm">
              Restro Code
            </div>

            <div className="text-3xl font-bold">
              {restro?.RestroCode}
            </div>

          </div>
        </div>

        {/* STATUS */}

        <div className="flex flex-wrap gap-4 mb-8">

          {[
            "In Kitchen",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
            "Not Delivered",
            "Bad Delivery",
          ].map((status) => (

            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`px-7 py-4 rounded-xl font-semibold transition ${
                activeTab === status
                  ? "bg-[#2f54eb] text-white"
                  : "bg-white border"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* TABLE */}

        <div className="bg-white rounded-2xl shadow-sm border overflow-auto">

          {loading ? (

            <div className="p-20 text-center text-2xl">
              Loading...
            </div>

          ) : filteredOrders.length === 0 ? (

            <div className="p-20 text-center">

              <h2 className="text-4xl font-bold mb-4">
                No Orders Yet
              </h2>

              <p className="text-gray-500 text-lg">
                Orders for this restro will appear here.
              </p>

            </div>

          ) : (

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
          )}
        </div>
      </div>
    </div>
  );
}
