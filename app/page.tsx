"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!mobile || !password) {
      alert("Please enter mobile and password");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("RestroMaster")
        .select("*")
        .eq("RestroLoginMobile", mobile)
        .eq("RestroPassword", password)
        .single();

      console.log(data);
      console.log(error);

      if (error || !data) {
        alert("Invalid Credentials");
        setLoading(false);
        return;
      }

      // SAVE LOGIN SESSION
      localStorage.setItem("restro", JSON.stringify(data));

      // REDIRECT TO ORDERS
      router.push("/orders");
    } catch (err) {
      console.log(err);
      alert("Login Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] pb-24 font-sans text-gray-900 max-w-md mx-auto flex flex-col justify-between shadow-2xl bg-white relative">
      
      {/* BRAND HEADER */}
      <header className="bg-white px-5 py-4 flex items-center gap-3 border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="w-9 h-9 bg-[#f4b400] rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
          <img 
            src="/logo.png" 
            alt="RailEats" 
            className="w-full h-full object-cover" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="font-black text-xs text-black">RE</span>
        </div>
        <div>
          <h1 className="text-base font-black tracking-tight text-gray-950">RailEats</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Restro Panel</p>
        </div>
      </header>

      {/* LOGIN CONTAINER */}
      <main className="p-5 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          
          {/* HEADER SECTION */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Restro Login</h2>
            <p className="text-xs text-gray-400 mt-1 font-medium">
              Enter your credentials to manage live train orders.
            </p>
          </div>

          {/* MOBILE INPUT */}
          <div className="mb-4">
            <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);
                setMobile(value);
              }}
              placeholder="Enter registered mobile number"
              className="w-full h-12 bg-gray-50 border border-gray-200/80 rounded-xl px-4 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
            />
          </div>

          {/* PASSWORD INPUT */}
          <div className="mb-6">
            <label className="block text-[11px] font-black text-gray-500 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full h-12 bg-gray-50 border border-gray-200/80 rounded-xl px-4 pr-12 text-xs font-bold outline-none focus:border-[#2f54eb] focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-base grayscale opacity-60 hover:opacity-100 transition"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* LOGIN CTA BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-[#2f54eb] hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-100 transition duration-150 disabled:opacity-60 flex items-center justify-center tracking-wide"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Verifying Account...
              </div>
            ) : (
              "LOG IN TO PANEL"
            )}
          </button>

          {/* HELP COMPONENT */}
          <p className="text-center text-gray-400 text-[11px] font-medium mt-4">
            🔒 Secured connection for authorized outlet managers.
          </p>
        </div>
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 h-16 flex items-center justify-around px-2 z-50 shadow-xl">
        <button 
          onClick={() => router.push("/orders")} 
          className="flex flex-col items-center justify-center flex-1 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Orders</span>
        </button>
        <button 
          onClick={() => router.push("/delivery-settings")} 
          className="flex flex-col items-center justify-center flex-1 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Settings</span>
        </button>
        <button 
          onClick={() => router.push("/profile")} 
          className="flex flex-col items-center justify-center flex-1 text-gray-400 hover:text-gray-600 transition"
        >
          <span className="text-xl">👤</span>
          <span className="text-[10px] font-bold mt-1 tracking-tight">Profile</span>
        </button>
      </nav>

    </div>
  );
}
