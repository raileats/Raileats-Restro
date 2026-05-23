"use client";

import { useEffect, useState } from "react";

export default function OrdersPage() {
  const [restro, setRestro] = useState<any>(null);

  useEffect(() => {
    const data = localStorage.getItem("restro");

    if (!data) {
      window.location.href = "/";
      return;
    }

    setRestro(JSON.parse(data));
  }, []);

  if (!restro) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex">

      {/* SIDEBAR */}
      <div className="w-[250px] bg-white border-r min-h-screen">

        <div className="p-5 border-b">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              className="w-[42px] h-[42px]"
            />

            <div>
              <h2 className="font-semibold text-[20px]">
                RailEats
              </h2>

              <p className="text-gray-500 text-sm">
                Restro Panel
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">

          <button className="text-left h-[46px] px-4 rounded-lg bg-[#1d4ed8] text-white font-medium">
            Orders
          </button>

          <button className="text-left h-[46px] px-4 rounded-lg hover:bg-gray-100">
            Restro Profile
          </button>

          <button className="text-left h-[46px] px-4 rounded-lg hover:bg-gray-100">
            Delivery Settings
          </button>

          <button
            onClick={() => {
              localStorage.removeItem("restro");
              window.location.href = "/";
            }}
            className="text-left h-[46px] px-4 rounded-lg hover:bg-red-50 text-red-600"
          >
            Logout
          </button>

        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8">

        <div className="flex items-center justify-between mb-8">

          <div>
            <h1 className="text-[36px] font-bold">
              Orders
            </h1>

            <p className="text-gray-500 mt-1">
              Welcome {restro.RestroName}
            </p>
          </div>

          <div className="bg-white px-5 py-3 rounded-xl shadow-sm">
            Restro Code: {restro.RestroCode}
          </div>
        </div>

        {/* STATUS TABS */}
        <div className="flex gap-3 flex-wrap mb-8">

          {[
            "In Kitchen",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
            "Not Delivered",
            "Bad Delivery",
          ].map((item) => (
            <button
              key={item}
              className="px-5 h-[44px] rounded-lg bg-[#1d4ed8] text-white font-medium"
            >
              {item}
            </button>
          ))}
        </div>

        {/* EMPTY STATE */}
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">

          <h2 className="text-2xl font-semibold mb-3">
            No Orders Yet
          </h2>

          <p className="text-gray-500">
            Orders for this restro will appear here.
          </p>
        </div>

      </div>
    </div>
  );
}
