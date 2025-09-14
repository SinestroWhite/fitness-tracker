// "use client";
// import { useEffect, useRef, useState, type ReactNode } from "react";
// import { useRouter, usePathname } from "next/navigation";
// import { useAuth } from "@/contexts/auth-context";

// const PUBLIC = ["/", "/login", "/register", "/forgot-password"];

// // how close to expiry should we "soft-check" on focus/visibility
// const NEAR_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// export default function RequireAuth({ children }: { children: ReactNode }) {
//   const { user, loading, expiresAtMs, refreshUser, logout } = useAuth();
//   const router = useRouter();
//   const pathname = usePathname();

//   const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

//   // ✅ Bootstrap flag: only block rendering before the very first auth load finishes
//   const [bootstrapped, setBootstrapped] = useState(false);
//   useEffect(() => {
//     if (!loading && !bootstrapped) setBootstrapped(true);
//   }, [loading, bootstrapped]);

//   // Helper
//   const authOk = () => !!user && !!expiresAtMs && expiresAtMs > Date.now();
//   const nearExpiry = () =>
//     !expiresAtMs || (expiresAtMs - Date.now()) <= NEAR_EXPIRY_MS;

//   const goLogin = (reason: "session-expired" | "logged-out" | "unauthorized" = "unauthorized") => {
//     const url = `/login&reason=${reason}`;
//     router.replace(url);
//   };

//   // 1) Initial protection – run only after bootstrap
//   useEffect(() => {
//     if (!isPublic && bootstrapped && !user) {
//       router.replace(`/login`);
//     }
//   }, [bootstrapped, isPublic, user, router, pathname]);

//   // 2) Auto-redirect exactly at expiry
//   useEffect(() => {
//     if (isPublic || !expiresAtMs) return;
//     const msLeft = expiresAtMs - Date.now();
//     if (msLeft <= 0) {
//       (async () => {
//         await logout();
//         //router.replace(`/login?from=${encodeURIComponent(pathname)}`);
//         goLogin("session-expired");
//       })();
//       return;
//     }
//     const t = setTimeout(async () => {
//       await logout();
//       //router.replace(`/login?from=${encodeURIComponent(pathname)}`);
//       goLogin("session-expired");
//     }, msLeft);
//     return () => clearTimeout(t);
//   }, [expiresAtMs, isPublic, logout, pathname, router]);

//   // 3) Soft-check on focus/visibility, but:
//   //    - only if near expiry (avoid noisy refreshes)
//   //    - debounce to collapse quick sequences (like file dialog)
//   const debounceRef = useRef<number | null>(null);
//   useEffect(() => {
//     if (isPublic) return;

//     const doCheck = async () => {
//       // Only refresh when it matters
//       if (!nearExpiry()) return;
//       await refreshUser(); // may flip loading, but we won't unmount due to bootstrapped guard
//       if (!authOk()) {
//         router.replace(`/login?from=${encodeURIComponent(pathname)}`);
//       }
//     };

//     const schedule = () => {
//       if (debounceRef.current) window.clearTimeout(debounceRef.current);
//       debounceRef.current = window.setTimeout(doCheck, 150); // small debounce tames the file dialog bounce
//     };

//     const onFocus = () => schedule();
//     const onVisibility = () => {
//       if (document.visibilityState === "visible") schedule();
//     };

//     window.addEventListener("focus", onFocus);
//     document.addEventListener("visibilitychange", onVisibility);
//     return () => {
//       window.removeEventListener("focus", onFocus);
//       document.removeEventListener("visibilitychange", onVisibility);
//       if (debounceRef.current) window.clearTimeout(debounceRef.current);
//     };
//   }, [isPublic, pathname, refreshUser, router, expiresAtMs, user]);

//   if (!isPublic && !bootstrapped) {
//     return null; // or your spinner
//   }
//   if (!isPublic && !user) {
//     // Redirect effect will run; keep UI empty to avoid flicker
//     return null;
//   }

//   return <>{children}</>;
// }


"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

const PUBLIC = ["/", "/login", "/register", "/forgot-password"];
const NEAR_EXPIRY_MS = 1 * 60 * 1000; // 1 мин

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, expiresAtMs, refreshUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Bootstrap guard: блокира рендер само докато първоначалното auth състояние се зареди
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    if (!loading && !bootstrapped) setBootstrapped(true);
  }, [loading, bootstrapped]);

  const authOk = () => !!user && !!expiresAtMs && expiresAtMs > Date.now();
  const nearExpiry = () => !expiresAtMs || expiresAtMs - Date.now() <= NEAR_EXPIRY_MS;

  // Единна функция за пренасочване към login с причина + from
  const goLogin = (
    reason: "session-expired" | "logged-out" | "unauthorized" = "unauthorized"
  ) => {
    const qs = new URLSearchParams();
    qs.set("reason", reason);
    // подавай "from" само ако не е публичен маршрут, иначе ще затворим redirect loop към /login
    //if (!isPublic && pathname)
    router.replace(`/login?${qs.toString()}`);
  };

  // 1) Първоначална защита – след bootstrap, ако потребител няма → unauthorized
  useEffect(() => {
    if (!isPublic && bootstrapped && !user) {
      goLogin("unauthorized");
    }
  }, [bootstrapped, isPublic, user]); // router/pathname не са нужни тук

  useEffect(() => {
    if (!isPublic && bootstrapped && !user) {
      const silent =
        typeof window !== "undefined" &&
        sessionStorage.getItem("logoutIntent") === "1";
  
      if (silent) {
        // clear the flag and redirect with NO reason/from
        sessionStorage.removeItem("logoutIntent");
        router.replace("/login");
      } else {
        // normal case: user hit a protected page without auth
        goLogin("unauthorized");
      }
    }
  }, [bootstrapped, isPublic, user, router]);
  

  // 2) Авто-редирект точно при изтичане
  useEffect(() => {
    if (isPublic || !expiresAtMs) return;

    const msLeft = expiresAtMs - Date.now();
    if (msLeft <= 0) {
      (async () => {
        try {
          await logout();
        } finally {
          goLogin("session-expired");
        }
      })();
      return;
    }

    const t = setTimeout(async () => {
      try {
        await logout();
      } finally {
        goLogin("session-expired");
      }
    }, msLeft);

    return () => clearTimeout(t);
  }, [expiresAtMs, isPublic, logout]);

  // 3) Soft-check при фокус/видимост около изтичане
  // const debounceRef = useRef<number | null>(null);
  // useEffect(() => {
  //   if (isPublic) return;
  //
  //   const doCheck = async () => {
  //     if (!nearExpiry()) return;
  //     await refreshUser();
  //     if (!authOk()) {
  //       goLogin("session-expired");
  //     }
  //   };
  //
  //   const schedule = () => {
  //     if (debounceRef.current) window.clearTimeout(debounceRef.current);
  //     debounceRef.current = window.setTimeout(doCheck, 150);
  //   };
  //
  //   const onFocus = () => schedule();
  //   const onVisibility = () => {
  //     if (document.visibilityState === "visible") schedule();
  //   };
  //
  //   window.addEventListener("focus", onFocus);
  //   document.addEventListener("visibilitychange", onVisibility);
  //   return () => {
  //     window.removeEventListener("focus", onFocus);
  //     document.removeEventListener("visibilitychange", onVisibility);
  //     if (debounceRef.current) window.clearTimeout(debounceRef.current);
  //   };
  // }, [isPublic, refreshUser, expiresAtMs, user]); // pathname/router не са нужни, използваме ги вътре в goLogin

  // Изчистен UI по време на пренасочване/bootstrapping
  if (!isPublic && !bootstrapped) return null;
  if (!isPublic && !user) return null;

  return <>{children}</>;
}
