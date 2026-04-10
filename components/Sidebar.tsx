"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface BudgetStats {
  budget: number;
  remaining: number;
  percentUsed: number;
  usage: { totalRequests: number; totalCostUSD: number };
}

const NAV = [
  { href: "/", label: "GÉNÉRER", icon: "✦", exact: true },
  { href: "/companies", label: "ENTREPRISES", icon: "◈" },
  { href: "/packages", label: "PACKAGES", icon: "▦" },
  { href: "/production", label: "PRODUCTION", icon: "▶" },
  { href: "/history", label: "HISTORIQUE", icon: "◑" },
  { href: "/reference-scripts", label: "BIBLIOTHÈQUE", icon: "◎" },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [budget, setBudget] = useState<BudgetStats | null>(null);

  useEffect(() => {
    fetch("/api/generate")
      .then((r) => r.json())
      .then(setBudget)
      .catch(() => null);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const pct = budget?.percentUsed ?? 0;

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 w-[220px] bg-olive-dark border-r border-white/[0.06]
        flex flex-col z-50 transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
      `}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-lime flex items-center justify-center shrink-0">
            <span className="text-olive-dark text-base font-bold">✦</span>
          </div>
          <div>
            <div className="text-white font-display text-xl tracking-wider leading-none">
              UGC SCRIPTS
            </div>
            <div className="text-white/30 text-[10px] mt-0.5 font-sans uppercase tracking-widest">
              Studio Savora
            </div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="md:hidden text-white/40 hover:text-white text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-1 sidebar-scroll overflow-y-auto">
        {NAV.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-sans font-medium uppercase tracking-widest transition-all duration-150 ${
                isActive
                  ? "bg-lime text-olive-dark"
                  : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              <span className={`text-xs ${isActive ? "text-olive-dark" : ""}`}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Budget */}
      <div className="px-5 pb-6 pt-4 border-t border-white/[0.06]">
        <div className="text-white/25 text-[9px] uppercase tracking-[0.2em] mb-3 font-sans font-semibold">
          Budget mensuel
        </div>
        {budget ? (
          <>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-white font-display text-lg tracking-wider leading-none">
                ${budget.usage.totalCostUSD.toFixed(3)}
              </span>
              <span className="text-white/30 text-xs font-mono">
                / ${budget.budget}
              </span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor:
                    pct >= 90 ? "#ef4444" : pct >= 70 ? "#f97316" : "#C9F019",
                }}
              />
            </div>
            <div className="text-white/25 text-[10px] font-sans">
              {budget.usage.totalRequests} génération
              {budget.usage.totalRequests !== 1 ? "s" : ""} ce mois
            </div>
          </>
        ) : (
          <div className="h-1 bg-white/10 rounded-full" />
        )}
      </div>
    </aside>
  );
}
