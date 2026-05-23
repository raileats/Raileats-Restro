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

      localStorage.setItem(
        "restro",
        JSON.stringify(data)
      );

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
    <div className="min-h-screen bg-[#f3f4f6]">

      {/* HEADER */}

      <div className="h-[74px] bg-white border-b border-gray-200 flex items-center px-16">

        <div className="flex items-center gap-4">

          <img
            src="/logo.png"
            alt="RailEats"
            className="w-[58px] h-[58px] object-contain"
          />

          <h1 className="text-[24px] font-semibold text-black">
            RailEats
          </h1>
        </div>
      </div>

      {/* LOGIN SECTION */}

      <div className="flex items-center justify-center py-20 px-4">

        <div className="w-full max-w-[460px] bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {/* LOGO */}

          <div className="mb-6 flex justify-center">

            <img
              src="/logo.png"
              alt="RailEats"
              className="w-[72px] h-[72px] object-contain"
            />
          </div>

          {/* TITLE */}

          <h2 className="text-[40px] font-bold text-center text-black mb-10">
            Restro Login
          </h2>

          {/* MOBILE */}

          <div className="mb-6">

            <label className="block text-[15px] font-medium text-black mb-2">
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
              placeholder="Enter mobile number"
              className="w-full h-[56px] border border-gray-300 rounded-xl px-4 text-[16px] outline-none focus:border-[#2f54eb]"
            />
          </div>

          {/* PASSWORD */}

          <div className="mb-8">

            <label className="block text-[15px] font-medium text-black mb-2">
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
                className="w-full h-[56px] border border-gray-300 rounded-xl px-4 pr-12 text-[16px] outline-none focus:border-[#2f54eb]"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[18px]"
              >
                👁️
              </button>
            </div>
          </div>

          {/* LOGIN BUTTON */}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-[58px] bg-[#f4b400] hover:bg-[#e5aa00] text-black text-[22px] font-semibold rounded-xl transition disabled:opacity-60"
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
