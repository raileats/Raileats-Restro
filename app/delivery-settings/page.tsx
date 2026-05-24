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
    WeeklyOff: "noOff",
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
          WeeklyOff: data.WeeklyOff || "noOff",
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
      <div className="h-[100dvh] max-w-md mx-auto flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2 bg-[#f7f9fc]">
        <span className="text-2xl animate-spin">⏳</span>
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl">

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
              {restro?.RestroName || "Mizaz E Bhopal"}
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
      <div className="bg-white flex-shrink-0 pt-3 pb-3 border-b border-gray-100 z-40 w-full px-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
          Settings
        </h2>

        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">
          Configure Delivery Preferences
        </p>
      </div>

      {/* CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4 touch-pan-y">

        <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm flex flex-col gap-4">

          {/* STATUS */}
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
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
              className="w-full h-11 bg-gray-50 border border-gray-200/80 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800"
            >
              <option value="true">🟢 Online</option>
              <option value="false">🔴 Offline</option>
            </select>
          </div>

          {/* WEEKLY OFF */}
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
              Weekly Off
            </label>

            <select
              value={form.WeeklyOff}
              onChange={(e) =>
                setForm({
                  ...form,
                  WeeklyOff: e.target.value,
                })
              }
              className="w-full h-11 bg-gray-50 border border-gray-200/80 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800"
            >
              <option value="noOff">No Off</option>
              <option value="SUN">Sunday</option>
              <option value="MON">Monday</option>
              <option value="TUE">Tuesday</option>
              <option value="WED">Wednesday</option>
              <option value="THU">Thursday</option>
              <option value="FRI">Friday</option>
              <option value="SAT">Saturday</option>
            </select>
          </div>

          {/* TIME */}
          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
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
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-3 text-sm font-bold outline-none focus:border-[#2f54eb] focus:ring-2 focus:ring-blue-100 transition-all text-gray-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
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
                className="w-full h-11 bg-white border border-gray-300 rounded-xl px-3 text-sm font-bold outline-none focus:border-[#2f54eb] focus:ring-2 focus:ring-blue-100 transition-all text-gray-800"
              />
            </div>

          </div>

          {/* ORDER */}
          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Min Order (₹)
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
                placeholder="e.g. 99"
                className="w-full h-11 bg-gray-50 border border-gray-200/80 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-wider mb-1.5">
                Cut Off (Mins)
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
                placeholder="e.g. 60"
                className="w-full h-11 bg-gray-50 border border-gray-200/80 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800"
              />
            </div>

          </div>

          {/* BUTTONS */}
          <div className="pt-2 space-y-2.5">

            <button
              onClick={saveSettings}
              disabled={saving}
              className="w-full h-11 bg-[#2f54eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-100 transition duration-150 disabled:opacity-60 flex items-center justify-center tracking-wide"
            >
              {saving ? "SAVING CONFIGS..." : "SAVE SETTINGS"}
            </button>

            <button
              onClick={logout}
              className="w-full h-11 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl transition duration-150 flex items-center justify-center tracking-wide"
            >
              LOGOUT FROM RESTRO
            </button>

          </div>

        </div>

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

        <button
          onClick={() => router.push("/menu")}
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">🍽️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">
            Menu
          </span>
        </button>

        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">
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
