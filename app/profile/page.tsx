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

  async function logout() {
    try {
      await fetch("/api/auth/restro-logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.log("Logout request failed", error);
    } finally {
      localStorage.removeItem("restro");
      router.replace("/");
      router.refresh();
    }
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
      

      {/* FIXED PAGE TITLE SEGMENT */}
      <div className="bg-white flex-shrink-0 pt-3 pb-3 border-b border-gray-100 z-40 w-full px-4">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">Outlet Profile</h2>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Verified Restro Details</p>
      </div>

      {/* 2. MIDDLE PROFILE INFO AREA (ONLY THIS PORTION SCROLLS) */}
      <main className="flex-1 overflow-y-auto bg-[#f7f9fc] px-4 py-4 space-y-4 touch-action-pan-y">
        
        {/* CORE AVATAR & BRAND CARD */}
        <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-md text-white">
            🏪
          </div>
          <div>
            <h3 className="font-black text-lg text-gray-900 leading-tight">
              {profileData?.RestroName}
            </h3>
            {profileData?.BrandNameifAny && (
              <span className="inline-block bg-amber-50 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-100 mt-1">
                ✨ {profileData.BrandNameifAny}
              </span>
            )}
            <p className="text-xs font-bold text-[#2f54eb] mt-1.5">
              📍 {profileData?.StationName} ({profileData?.StationCode})
            </p>
          </div>
        </div>

        {/* RESTAURANT CONTACT DETAILS */}
        <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm flex flex-col gap-3.5">
          <h4 className="text-[11px] font-black text-[#2f54eb] uppercase tracking-wider mb-1">📞 Restaurant Contact</h4>
          
          <div className="flex justify-between items-start border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Phone Number</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5">{profileData?.RestroPhone || "—"}</p>
            </div>
          </div>

          <div className="flex justify-between items-start border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5 break-all">{profileData?.RestroEmail || "—"}</p>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Outlet Address</p>
              <p className="font-extrabold text-gray-700 text-xs mt-1 leading-relaxed">{profileData?.RestroAddress || "—"}</p>
            </div>
          </div>
        </div>

        {/* OWNER DETAILS */}
        <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm flex flex-col gap-3.5">
          <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-wider mb-1">👤 Owner Information</h4>
          
          <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Owner Name</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5">{profileData?.OwnerName || "—"}</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Owner Phone</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5">{profileData?.OwnerPhone || "—"}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Owner Email</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5 break-all">{profileData?.OwnerEmail || "—"}</p>
            </div>
          </div>
        </div>

        {/* LEGAL & COMPLIANCE DETAILS */}
        <div className="bg-white rounded-3xl border border-gray-100/80 p-5 shadow-sm flex flex-col gap-3.5">
          <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-wider mb-1">📜 Legal Documents & Tax</h4>
          
          <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">FSSAI License Number</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5 text-mono">{profileData?.FSSAINumber || "—"}</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded">FSSAI</span>
          </div>

          <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GST Number (GSTIN)</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5 text-mono">{profileData?.GSTNumber || "—"}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">PAN Card Number</p>
              <p className="font-extrabold text-gray-800 text-xs mt-0.5 text-mono">{profileData?.PANNumber || "—"}</p>
            </div>
          </div>
        </div>

        {/* LOGOUT ACTION */}
        <div className="px-1">
          <button
            onClick={logout}
            className="w-full h-11 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black rounded-xl transition duration-150 flex items-center justify-center tracking-wide"
          >
            LOGOUT FROM APPLICATION
          </button>
        </div>

      </main>


    </div>
  );
}
