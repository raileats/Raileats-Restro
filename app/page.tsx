"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      try {
        const response = await fetch("/api/auth/restro-session", {
          method: "GET",
          cache: "no-store",
        });

        const json = await response.json().catch(() => ({}));

        if (!active) return;

        if (response.ok && json?.ok && json?.authenticated && json?.restro) {
          localStorage.setItem("restro", JSON.stringify(json.restro));
          router.replace("/orders");
          return;
        }

        localStorage.removeItem("restro");
      } catch {
        if (active) {
          localStorage.removeItem("restro");
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    checkExistingSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin(event?: FormEvent) {
    event?.preventDefault();

    if (loading) return;

    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

    if (cleanMobile.length !== 10 || !password.trim()) {
      setError("Please enter valid mobile number and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/restro-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: cleanMobile,
          password,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.ok || !json?.restro) {
        throw new Error(json?.error || "Invalid credentials");
      }

      // Temporary compatibility for existing Orders/Menu/Profile pages.
      // Only safe public restaurant fields are stored; password is never stored.
      localStorage.setItem("restro", JSON.stringify(json.restro));

      router.replace("/orders");
      router.refresh();
    } catch (loginError: any) {
      localStorage.removeItem("restro");
      setError(loginError?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9fc]">
        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 text-xs font-black text-gray-600 shadow-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#2f54eb] border-t-transparent" />
          Checking secure session...
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col justify-between overflow-hidden border-x border-gray-100 bg-white shadow-2xl">
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-5 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-200 bg-white shadow-sm">
          <img
            src="/logo.png"
            alt="RailEats"
            className="h-full w-full rounded-full object-contain p-1"
          />
        </div>

        <div>
          <h1 className="mb-0.5 text-base font-black leading-none tracking-tight text-gray-950">
            RailEats
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Restro Panel
          </p>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center overflow-y-auto bg-[#f7f9fc] p-5">
        <form
          onSubmit={handleLogin}
          className="w-full rounded-3xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-5 text-center">
            <h2 className="text-2xl font-black tracking-tight text-gray-900">
              Restro Login
            </h2>
            <p className="mt-1 text-xs font-medium text-gray-400">
              Securely sign in to manage live train orders.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mb-4">
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              Mobile Number
            </label>

            <input
              type="tel"
              inputMode="numeric"
              autoComplete="username"
              maxLength={10}
              value={mobile}
              onChange={(event) => {
                setMobile(event.target.value.replace(/\D/g, "").slice(0, 10));
                setError(null);
              }}
              placeholder="Enter registered mobile number"
              className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 text-xs font-bold text-gray-800 outline-none transition-all focus:border-[#2f54eb] focus:bg-white"
            />
          </div>

          <div className="mb-5">
            <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-gray-500">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  setError(null);
                }}
                placeholder="Enter account password"
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 pr-12 text-xs font-bold text-gray-800 outline-none transition-all focus:border-[#2f54eb] focus:bg-white"
              />

              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-base opacity-60 transition hover:opacity-100"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2f54eb] text-xs font-black tracking-wide text-white shadow-md shadow-blue-100 transition duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying...
              </span>
            ) : (
              "LOG IN TO PANEL"
            )}
          </button>

          <p className="mt-4 text-center text-[10px] font-semibold text-gray-400">
            Your password is verified securely on the server and is never saved
            in browser storage.
          </p>
        </form>
      </main>

      <div className="h-4 flex-shrink-0 border-t border-gray-100 bg-white" />
    </div>
  );
}
