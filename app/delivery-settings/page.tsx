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
      <div className="h-full w-full flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2 bg-[#f7f9fc]">
        <span className="text-2xl animate-spin">⏳</span>
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl">

</div>
  );
}
