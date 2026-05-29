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
      <div className="h-[100dvh] max-w-md mx-auto flex flex-col items-center justify-center font-bold text-sm text-gray-400 gap-2 bg-[#f7f9fc]">
        <span className="text-2xl animate-spin">⏳</span>
        Loading Profile...
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full max-w-md mx-auto flex flex-col bg-[#f7f9fc] overflow-hidden relative shadow-2xl select-none touch-action-none">
      
      {/* 1. FIXED TOP APP HEADER */}
      <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 flex-shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white border border-yellow-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
            <img 
              src="/logo.png" 
              alt="RailEats" 
              className="w-full h-full object-contain rounded-full p-1" 
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <span className="hidden w-full h-full items-center justify-center rounded-full bg-[#f4b400] text-[11px] font-black text-black">RE</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight text-gray-900 leading-none mb-0.5">RailEats</h1>
            <p className="text-xs text-gray-500 font-semibold truncate max-w-[160px]">{profileData?.RestroName || "Restaurant"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="bg-[#2f54eb] text-white text-xs font-black px-2.5 py-1.5 rounded-lg min-w-[54px] text-center shadow-md shadow-blue-100">
            Code {profileData?.RestroCode}
          </div>
        </div>
      </header>

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

      {/* 3. ALWAYS FIXED BOTTOM NAVIGATION BAR */}
      <nav className="bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 flex-shrink-0 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] pb-safe">
        <button 
          onClick={() => router.push("/orders")} 
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Orders</span>
        </button>
        <button 
          onClick={() => router.push("/delivery-settings")} 
          className="flex flex-col items-center justify-center flex-1 h-full text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>
        <button className="flex flex-col items-center justify-center flex-1 h-full text-[#2f54eb]">
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-black mt-1 tracking-tight">Profile</span>
        </button>
        <button 
          onClick={logout} 
          className="flex flex-col items-center justify-center flex-1 h-full text-red-400 hover:text-red-500 transition"
        >
          <span className="text-xl">🚪</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Logout</span>
        </button>
      </nav>

    </div>
  );
}
