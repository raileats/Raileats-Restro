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
    <div className="h-full w-full flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none touch-action-none">

</div>
  );
}
