"use client";
import { Cloud, HardDrive } from "lucide-react";

export default function ExportToggle({
  enabled,
  onChange,
  disabled
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/10 ${disabled ? "opacity-50" : ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
          !enabled 
            ? "bg-primary text-primary-foreground shadow-lg" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <HardDrive className="w-3.5 h-3.5" />
        Local Only
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
          enabled 
            ? "bg-emerald-600 text-white shadow-lg" 
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Cloud className="w-3.5 h-3.5" />
        Sync to Drive
      </button>
    </div>
  );
}
