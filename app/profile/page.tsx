"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const router = useRouter();

  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const stored = localStorage.getItem("restro");

      if (!stored) {
        router.push("/");
        return;
      }

      const restroData = JSON.parse(stored);

      // RestroMaster टेबल से सभी कॉलम्स का डेटा फैच करना
      const { data, error } = await supabase
        .from("RestroMaster")
        .select("*")
        .eq("RestroCode", restroData.RestroCode)
        .single();

      if (!error && data) {
        setProfileData(data);
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

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2 bg-[#f7f9fc]">
        <span className="text-2xl animate-spin">⏳</span>
        Loading Profile...
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none touch-action-none">
      
</div>
  );
}
