"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobile || !password) {
      alert("Please enter mobile and password");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
  .from("RestroMaster")
  .select("*")
  .eq("RestroLoginMobile", mobile)
  .eq("RestroPassword", password)
  .single();
    setLoading(false);

    if (error || !data) {
      alert("Invalid Credentials");
      return;
    }

    alert(`Welcome ${data.restaurant_name}`);

    // NEXT STEP
    // dashboard redirect yaha hoga
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      {/* HEADER */}
      <div className="h-[74px] bg-white border-b flex items-center px-16">
        <div className="flex items-center gap-4">
          <img
            src="/logo.png"
            alt="RailEats"
            className="w-[58px] h-[58px]"
          />

          <h1 className="text-[22px] font-semibold text-black">
            RailEats
          </h1>
        </div>
      </div>

      {/* LOGIN */}
      <div className="flex items-center justify-center py-20">
        <div className="w-[440px] bg-white rounded-xl shadow-sm p-8">
          
          {/* LOGO */}
          <div className="mb-6">
            <img
              src="/logo.png"
              alt="RailEats"
              className="w-[64px] h-[64px]"
            />
          </div>

          {/* TITLE */}
          <h2 className="text-[38px] font-semibold text-center mb-10">
            Restro Login
          </h2>

          {/* MOBILE */}
          <div className="mb-6">
            <label className="block text-[15px] mb-2 font-medium">
              Mobile Number
            </label>

            <input
              type="text"
              value={mobile}
              onChange={(e) => {
                const value = e.target.value
                  .replace(/\D/g, "")
                  .slice(0, 10);

                setMobile(value);
              }}
              placeholder="Enter mobile number"
              className="w-full h-[56px] border border-gray-300 rounded-lg px-4 text-[16px] outline-none focus:border-black"
            />
          </div>

          {/* PASSWORD */}
          <div className="mb-8">
            <label className="block text-[15px] mb-2 font-medium">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) =>
                  setPassword(e.target.value)
                }
                placeholder="Enter password"
                className="w-full h-[56px] border border-gray-300 rounded-lg px-4 pr-12 text-[16px] outline-none focus:border-black"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                👁️
              </button>
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[56px] bg-[#f4b400] hover:bg-[#e5aa00] text-black text-[22px] font-semibold rounded-lg transition"
          >
            {loading ? "Please wait..." : "Log in"}
          </button>

          {/* FOOTER */}
          <p className="text-center text-gray-500 text-sm mt-6">
            Please use your restro credentials.
          </p>
        </div>
      </div>
    </div>
  );
}
