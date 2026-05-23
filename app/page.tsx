"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("RestroMaster")
        .select("*")
        .eq("RestroLoginMobile", mobile)
        .eq("RestroPassword", password)
        .single();

      if (error || !data) {
        alert("Invalid Mobile or Password");
        return;
      }

      alert(`Login Success\nRestro: ${data.RestroName}`);

      console.log("RESTRO:", data);
    } catch (e) {
      console.error(e);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center">

      <div className="bg-white p-8 rounded-2xl shadow-xl w-[400px]">

        <h1 className="text-3xl font-bold text-center mb-6">
          Restro Login
        </h1>

        <div className="space-y-4">

          <input
            type="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => {
              let value = e.target.value.replace(/\D/g, "");
              value = value.slice(0, 10);
              setMobile(value);
            }}
            className="w-full border rounded-lg px-4 py-3"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            className="w-full border rounded-lg px-4 py-3"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white rounded-lg py-3 font-semibold"
          >
            {loading ? "Please wait..." : "Login"}
          </button>

        </div>

      </div>

    </main>
  );
}