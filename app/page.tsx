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
    <div className="min-h-screen bg-[#f8f9fa] font-sans text-gray-900 max-w-md mx-auto flex flex-col justify-between shadow-xl">
      
      {/* BRAND HEADER */}
      <header className="bg-white px-6 py-4 flex items-center gap-3 border-b border-gray-100">
        <div className="w-9 h-9 bg-[#f4b400] rounded-xl flex items-center justify-center shadow-sm">
          <img src="/logo.png" alt="RailEats" className="w-6 h-6 object-contain" />
        </div>
        <h1 className="text-lg font-black tracking-tight">RailEats</h1>
      </header>

      {/* LOGIN CARD */}
      <main className="p-6 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-gray-950">Restro Login</h2>
            <p className="text-xs text-gray-400 mt-1 font-medium">Manage your station kitchen orders seamlessly</p>
          </div>

          {/* MOBILE INPUT */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Mobile Number
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={mobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setMobile(value);
              }}
              placeholder="Enter 10-digit mobile number"
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-sm font-medium outline-none focus:border-[#2f54eb] focus:bg-white transition-all"
            />
          </div>

          {/* PASSWORD INPUT */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 pr-12 text-sm font-medium outline-none focus:border-[#2f54eb] focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm gray-400 hover:text-gray-600"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* LOGIN BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 bg-[#2f54eb] hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-100 transition duration-150 disabled:opacity-60 flex items-center justify-center"
          >
            {loading ? "Verifying Credentials..." : "Log In to Dashboard"}
          </button>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="p-6 text-center">
        <p className="text-xs text-gray-400 font-medium">
          Authorized Restro Panel Access Only.
        </p>
      </footer>

    </div>
  );
}
