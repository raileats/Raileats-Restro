"use client";

// components/restro/RestroShell.tsx

import Image from "next/image";
import Link from "next/link";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type RestroSessionData = {
  RestroCode?:
    number | string | null;

  RestroName?:
    string | null;

  StationCode?:
    string | null;

  StationName?:
    string | null;

  State?:
    string | null;

  RestroLoginMobile?:
    string | null;

  RestroUserName?:
    string | null;

  OwnerName?:
    string | null;

  RestroDisplayPhoto?:
    string | null;
};

type SessionResponse = {
  ok: boolean;

  authenticated?:
    boolean;

  restro?:
    RestroSessionData | null;

  error?:
    string;
};

type Props = {
  children:
    React.ReactNode;
};

const PROTECTED_PREFIXES = [
  "/orders",
  "/menu",
  "/ledger",
  "/profile",
  "/delivery-settings",
  "/dashboard",
];

const NAV_ITEMS = [
  {
    label:
      "Orders",
    href:
      "/orders",
    icon:
      "📋",
  },
  {
    label:
      "Menu",
    href:
      "/menu",
    icon:
      "🍽️",
  },
  {
    label:
      "Ledger",
    href:
      "/ledger",
    icon:
      "₹",
  },
  {
    label:
      "Settings",
    href:
      "/delivery-settings",
    icon:
      "⚙️",
  },
  {
    label:
      "Profile",
    href:
      "/profile",
    icon:
      "👤",
  },
];

function textValue(
  value: unknown
) {
  return value === null ||
    value === undefined
    ? ""
    : String(value).trim();
}

function isProtectedPath(
  pathname: string
) {
  return PROTECTED_PREFIXES.some(
    (
      prefix
    ) =>
      pathname ===
        prefix ||
      pathname.startsWith(
        `${prefix}/`
      )
  );
}

function pageTitle(
  pathname: string
) {
  if (
    pathname.startsWith(
      "/orders"
    )
  ) {
    return "Orders";
  }

  if (
    pathname.startsWith(
      "/menu"
    )
  ) {
    return "Menu";
  }

  if (
    pathname.startsWith(
      "/ledger"
    )
  ) {
    return "Ledger";
  }

  if (
    pathname.startsWith(
      "/delivery-settings"
    )
  ) {
    return "Settings";
  }

  if (
    pathname.startsWith(
      "/profile"
    )
  ) {
    return "Profile";
  }

  if (
    pathname.startsWith(
      "/dashboard"
    )
  ) {
    return "Dashboard";
  }

  return "Restro Panel";
}

function readStoredRestro() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        "restro"
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw
      );

    if (
      !parsed ||
      !Number(
        parsed.RestroCode
      )
    ) {
      return null;
    }

    return parsed as
      RestroSessionData;
  } catch {
    return null;
  }
}

export default function RestroShell({
  children,
}: Props) {
  const pathname =
    usePathname() ||
    "/";

  const router =
    useRouter();

  const protectedPath =
    isProtectedPath(
      pathname
    );

  const [
    restro,
    setRestro,
  ] =
    useState<RestroSessionData | null>(
      null
    );

  const [
    initialized,
    setInitialized,
  ] =
    useState(
      !protectedPath
    );

  const [
    sessionWarning,
    setSessionWarning,
  ] =
    useState<string | null>(
      null
    );

  const [
    loggingOut,
    setLoggingOut,
  ] =
    useState(false);

  /*
   * Local safe session summary immediately load hoti hai.
   * Isse har tab click par full-screen "Verifying..." spinner nahi aata.
   * Actual security proxy.ts aur HTTP-only cookie se enforce hoti hai.
   */
  useEffect(() => {
    if (
      !protectedPath
    ) {
      setInitialized(
        true
      );
      return;
    }

    const stored =
      readStoredRestro();

    if (stored) {
      setRestro(
        stored
      );
    }

    setInitialized(
      true
    );
  }, [
    protectedPath,
  ]);

  const verifySession =
    useCallback(
      async () => {
        if (
          !protectedPath
        ) {
          return;
        }

        const controller =
          new AbortController();

        const timeout =
          window.setTimeout(
            () => {
              controller.abort();
            },
            8000
          );

        try {
          const response =
            await fetch(
              "/api/auth/restro-session",
              {
                method:
                  "GET",

                cache:
                  "no-store",

                credentials:
                  "include",

                signal:
                  controller.signal,
              }
            );

          const json:
            SessionResponse =
            await response
              .json()
              .catch(
                () => ({
                  ok:
                    false,
                })
              );

          if (
            response.status ===
              401 ||
            !json.authenticated
          ) {
            try {
              window.localStorage.removeItem(
                "restro"
              );
            } catch {
              // Ignore storage error.
            }

            const next =
              encodeURIComponent(
                pathname
              );

            router.replace(
              `/?next=${next}`
            );

            return;
          }

          if (
            !response.ok ||
            !json.ok ||
            !json.restro
          ) {
            setSessionWarning(
              json.error ||
              "Session details temporarily unavailable"
            );

            return;
          }

          setRestro(
            json.restro
          );

          setSessionWarning(
            null
          );

          try {
            window.localStorage.setItem(
              "restro",
              JSON.stringify(
                json.restro
              )
            );
          } catch {
            // Ignore storage error.
          }
        } catch (
          error: any
        ) {
          /*
           * Network/timeout error par current page block nahi karni.
           * Proxy already secure route verify kar chuka hai.
           */
          if (
            error?.name !==
            "AbortError"
          ) {
            setSessionWarning(
              "Session refresh temporarily unavailable"
            );
          }
        } finally {
          window.clearTimeout(
            timeout
          );
        }
      },
      [
        pathname,
        protectedPath,
        router,
      ]
    );

  useEffect(() => {
    verifySession();
  }, [
    verifySession,
  ]);

  async function handleLogout() {
    if (
      loggingOut
    ) {
      return;
    }

    setLoggingOut(
      true
    );

    try {
      await fetch(
        "/api/auth/restro-logout",
        {
          method:
            "POST",

          credentials:
            "include",
        }
      );
    } catch {
      // Local logout still continues.
    } finally {
      try {
        window.localStorage.removeItem(
          "restro"
        );

        window.localStorage.removeItem(
          "restro_new_orders"
        );
      } catch {
        // Ignore storage errors.
      }

      router.replace(
        "/"
      );

      router.refresh();

      setLoggingOut(
        false
      );
    }
  }

  const subtitle =
    useMemo(
      () => {
        const station =
          [
            restro
              ?.StationCode,
            restro
              ?.StationName,
          ]
            .filter(
              Boolean
            )
            .join(
              " - "
            );

        return (
          station ||
          textValue(
            restro
              ?.RestroName
          ) ||
          "Restaurant Partner"
        );
      },
      [
        restro,
      ]
    );

  if (
    !protectedPath
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  if (
    !initialized
  ) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f7f9fc] px-5">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-lg">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

          <div className="mt-4 text-sm font-black text-slate-700">
            Opening restaurant panel...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="restro-shell mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-[#f7f9fc] shadow-2xl">
      <header className="restro-shell-header flex flex-shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full border border-yellow-200 bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="RailEats"
              fill
              sizes="44px"
              className="object-contain p-1"
              priority
            />
          </div>

          <div className="min-w-0">
            <div className="truncate text-base font-black leading-none text-slate-950">
              RailEats
            </div>

            <div className="mt-1 truncate text-[11px] font-bold uppercase tracking-wide text-slate-400">
              {pageTitle(
                pathname
              )}
              {" · "}
              {subtitle}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-black text-white shadow-sm">
            {textValue(
              restro
                ?.RestroCode
            )
              ? `Code ${restro?.RestroCode}`
              : "Partner"}
          </div>

          <button
            type="button"
            onClick={
              handleLogout
            }
            disabled={
              loggingOut
            }
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-sm hover:bg-red-100 disabled:opacity-50"
          >
            {loggingOut
              ? "…"
              : "🚪"}
          </button>
        </div>
      </header>

      {sessionWarning ? (
        <button
          type="button"
          onClick={
            verifySession
          }
          className="flex-shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-left text-[10px] font-bold text-amber-700"
        >
          {sessionWarning}. Tap to retry.
        </button>
      ) : null}

      <div className="restro-shell-content min-h-0 flex-1 overflow-hidden">
        {children}
      </div>

      <nav className="restro-shell-nav grid flex-shrink-0 grid-cols-5 border-t border-slate-200 bg-white px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_30px_rgba(15,23,42,0.06)]">
        {NAV_ITEMS.map(
          (
            item
          ) => {
            const active =
              pathname ===
                item.href ||
              pathname.startsWith(
                `${item.href}/`
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                prefetch={
                  true
                }
                className={[
                  "flex min-w-0 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-center transition",
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-700",
                ].join(
                  " "
                )}
              >
                <span className="text-lg leading-none">
                  {item.icon}
                </span>

                <span className="mt-1 truncate text-[9px] font-black">
                  {item.label}
                </span>
              </Link>
            );
          }
        )}
      </nav>
    </div>
  );
}
