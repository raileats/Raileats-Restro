"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DeliverySettingsPage() {
  const router = useRouter();

  const [restro, setRestro] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    RaileatsStatus: true,
    WeeklyOff: "",
    open_time: "",
    closed_time: "",
    MinimumOrderValue: "",
    CutOffTime: "",
  });

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
        .from("RestroMaster")
        .select("*")
        .eq("RestroCode", restroData.RestroCode)
        .single();

      if (!error && data) {
        setForm({
          RaileatsStatus: data.RaileatsStatus ?? true,
          WeeklyOff: data.WeeklyOff || "",
          open_time: data.open_time || "",
          closed_time: data.closed_time || "",
          MinimumOrderValue: data.MinimumOrderValue || "",
          CutOffTime: data.CutOffTime || "",
        });
      }

      setLoading(false);

    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      setSaving(true);

      const { error } = await supabase
        .from("RestroMaster")
        .update({
          RaileatsStatus: form.RaileatsStatus,
          WeeklyOff: form.WeeklyOff,
          open_time: form.open_time,
          closed_time: form.closed_time,
          MinimumOrderValue: form.MinimumOrderValue,
          CutOffTime: form.CutOffTime,
        })
        .eq("RestroCode", restro.RestroCode);

      if (error) {
        console.log(error);
        alert("Failed to save settings");
        setSaving(false);
        return;
      }

      alert("Settings Updated Successfully");

    } catch (err) {
      console.log(err);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    localStorage.removeItem("restro");
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f6fb] flex items-center justify-center text-xl font-bold">
        Loading...
      </div>
    );
  }

  return (<div className="h-[100dvh] max-w-md mx-auto bg-[#f5f6fb] overflow-y-auto pb-[95px] relative shadow-2xl border-x border-gray-100"><div className="min-h-screen bg-[#f5f6fb] pb-[90px]">

      {/* HEADER */}

      <div className="bg-white px-5 py-4 border-b border-gray-100 sticky top-0 z-40">
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

      {/* CONTENT */}

      <div className="p-4">

        <h1 className="text-[34px] font-bold mb-5">
          Delivery Settings
        </h1>

        <div className="bg-white rounded-[30px] p-5 shadow-sm flex flex-col gap-5">

          {/* ONLINE STATUS */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Raileats Status
            </label>

            <select
              value={form.RaileatsStatus ? "true" : "false"}
              onChange={(e) =>
                setForm({
                  ...form,
                  RaileatsStatus: e.target.value === "true",
                })
              }
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            >
              <option value="true">Online</option>
              <option value="false">Offline</option>
            </select>
          </div>

          {/* WEEKLY OFF */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Weekly Off
            </label>

            <input
              type="text"
              value={form.WeeklyOff}
              onChange={(e) =>
                setForm({
                  ...form,
                  WeeklyOff: e.target.value,
                })
              }
              placeholder="Example : Sunday"
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            />
          </div>

          {/* OPEN TIME */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Open Time
            </label>

            <input
              type="time"
              value={form.open_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  open_time: e.target.value,
                })
              }
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            />
          </div>

          {/* CLOSE TIME */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Closed Time
            </label>

            <input
              type="time"
              value={form.closed_time}
              onChange={(e) =>
                setForm({
                  ...form,
                  closed_time: e.target.value,
                })
              }
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            />
          </div>

          {/* MIN ORDER */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Minimum Order Value
            </label>

            <input
              type="number"
              value={form.MinimumOrderValue}
              onChange={(e) =>
                setForm({
                  ...form,
                  MinimumOrderValue: e.target.value,
                })
              }
              placeholder="Minimum Order Value"
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            />
          </div>

          {/* CUT OFF */}

          <div>

            <label className="text-sm font-semibold text-gray-500">
              Cut Off Time
            </label>

            <input
              type="number"
              value={form.CutOffTime}
              onChange={(e) =>
                setForm({
                  ...form,
                  CutOffTime: e.target.value,
                })
              }
              placeholder="Cut Off Time"
              className="w-full h-14 mt-2 rounded-2xl border px-4 text-lg font-semibold outline-none"
            />
          </div>

          {/* SAVE */}

          <button
            onClick={saveSettings}
            disabled={saving}
            className="h-14 rounded-2xl bg-[#2f54eb] text-white text-lg font-bold mt-3"
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>

          {/* LOGOUT */}

          <button
            onClick={logout}
            className="h-14 rounded-2xl bg-red-50 text-red-500 text-lg font-bold"
          >
            Logout
          </button>

        </div>
      </div>

      {/* BOTTOM NAV */}

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full

        <button
          onClick={() => router.push("/orders")}
          className="flex flex-col items-center text-gray-700"
        >
          <span className="text-[24px]">
            📦
          </span>

          <span className="text-[13px] mt-1">
            Orders
          </span>
        </button>

        <button className="flex flex-col items-center text-[#2f54eb] font-semibold">

          <span className="text-[24px]">
            ⚙️
          </span>

          <span className="text-[13px] mt-1">
            Delivery
          </span>

        </button>

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
