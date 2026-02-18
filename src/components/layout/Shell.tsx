"use client";

import React, { useCallback, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);
  const openMobileSidebar = useCallback(() => setMobileSidebarOpen(true), []);

  return (
    <div className="ops-shell flex min-h-screen bg-background">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={closeMobileSidebar}
      />
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      ) : null}
      <div className="flex min-h-screen flex-1 flex-col md:pl-64">
        <Topbar onMenuClick={openMobileSidebar} />
        <main className="flex-1 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6">{children}</main>
      </div>
    </div>
  );
}
