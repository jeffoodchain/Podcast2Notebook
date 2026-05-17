"use client";
import { useState, useEffect } from "react";
import { Cloud, Check } from "lucide-react";

interface DriveStatus {
  loading: boolean;
  configured: boolean;
  connected: boolean;
  email: string | null;
}

/**
 * Shows the Google Drive connection state and a one-click "Connect" action.
 * Self-fetches status on mount — after the OAuth callback redirects back to
 * the home page, this remounts and reflects the new connected state.
 */
export default function DriveConnect() {
  const [status, setStatus] = useState<DriveStatus>({
    loading: true,
    configured: false,
    connected: false,
    email: null,
  });

  const refresh = async () => {
    try {
      const res = await fetch("/api/auth/google/status");
      const d = await res.json();
      setStatus({
        loading: false,
        configured: !!d.configured,
        connected: !!d.connected,
        email: d.email ?? null,
      });
    } catch {
      setStatus((s) => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const disconnect = async () => {
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    refresh();
  };

  if (status.loading) return null;

  if (!status.configured) {
    return (
      <p className="text-xs text-white/35">
        此伺服器尚未設定 Google Drive 整合。
      </p>
    );
  }

  if (status.connected) {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-400">
        <Check className="w-3.5 h-3.5" />
        <span>已連結 Drive{status.email ? ` · ${status.email}` : ""}</span>
        <button
          type="button"
          onClick={disconnect}
          className="ml-1 text-white/35 hover:text-white/60 underline underline-offset-2"
        >
          解除連結
        </button>
      </div>
    );
  }

  return (
    <a
      href="/api/auth/google"
      className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
    >
      <Cloud className="w-3.5 h-3.5" />
      連結 Google Drive
    </a>
  );
}
