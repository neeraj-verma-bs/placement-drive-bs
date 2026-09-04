"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/", label: "My sheet" },
  { href: "/combined", label: "Combined list" },
] as const;

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // The gate has its own bare layout.
  if (pathname === "/login") return null;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      {/* Full width below `sm`, so the nav and sign-out wrap onto a second row. */}
      <span className="w-full text-sm font-semibold tracking-tight sm:w-auto">
        Placement Drive
      </span>
      <nav className="flex gap-1">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-2.5 py-1 text-sm ${
              pathname === href
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        onClick={signOut}
        className="ml-auto text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        Sign out
      </button>
    </header>
  );
}
