"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Toaster from "@/components/Toast";
import { isAuthenticated } from "@/lib/auth";
import { Activity } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  // Full-screen loading prevents flash of unauthenticated content
  if (!ready) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-pulse flex items-center justify-center shadow-lg shadow-violet/30 animate-pulse">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <p className="text-xs text-text-muted tracking-widest uppercase">Loading Pulse…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <div className="p-6 max-w-[1440px]">{children}</div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
