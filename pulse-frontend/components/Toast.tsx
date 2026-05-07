"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// Simple global toast store
let _listeners: Array<(toasts: ToastItem[]) => void> = [];
let _toasts: ToastItem[] = [];

function notify(toasts: ToastItem[]) {
  _toasts = toasts;
  _listeners.forEach((l) => l([..._toasts]));
}

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    notify([..._toasts, { id, message, type: "success" }]);
    setTimeout(() => notify(_toasts.filter((t) => t.id !== id)), 3500);
  },
  error: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    notify([..._toasts, { id, message, type: "error" }]);
    setTimeout(() => notify(_toasts.filter((t) => t.id !== id)), 4500);
  },
  info: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    notify([..._toasts, { id, message, type: "info" }]);
    setTimeout(() => notify(_toasts.filter((t) => t.id !== id)), 3000);
  },
};

const ICON = {
  success: CheckCircle,
  error:   XCircle,
  info:    AlertCircle,
};

const COLORS = {
  success: "border-green/20 bg-green/5 text-green",
  error:   "border-red/20 bg-red/5 text-red",
  info:    "border-violet/20 bg-violet/5 text-violet",
};

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (t: ToastItem[]) => setToasts(t);
    _listeners.push(listener);
    return () => { _listeners = _listeners.filter((l) => l !== listener); };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICON[t.type];
        return (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border glass",
              "shadow-xl shadow-black/30 pointer-events-auto animate-slide-up",
              COLORS[t.type]
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm text-text font-medium">{t.message}</span>
            <button
              onClick={() => notify(_toasts.filter((x) => x.id !== t.id))}
              className="ml-2 text-text-muted hover:text-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
