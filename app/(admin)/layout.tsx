"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-olive-dark border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex flex-col gap-1 p-1"
          aria-label="Ouvrir le menu"
        >
          <span className="w-5 h-0.5 bg-white/70 block rounded" />
          <span className="w-5 h-0.5 bg-white/70 block rounded" />
          <span className="w-5 h-0.5 bg-white/70 block rounded" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-lime flex items-center justify-center shrink-0">
            <span className="text-olive-dark text-xs font-bold">✦</span>
          </div>
          <span className="text-white font-display text-base tracking-wider">UGC SCRIPTS</span>
        </div>
      </div>

      {/* Overlay when sidebar open on mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content — offset for sidebar on desktop, offset for top bar on mobile */}
      <div className="md:ml-[220px] min-h-screen flex flex-col pt-[52px] md:pt-0">
        {children}
      </div>
    </>
  );
}
