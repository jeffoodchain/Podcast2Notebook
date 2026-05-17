"use client";
import { ReactNode } from "react";
import { Sparkles, Cloud } from "lucide-react";
import DriveConnect from "./DriveConnect";

type Accent = "violet" | "emerald";

const ACCENT: Record<Accent, { on: string; icon: string }> = {
  violet: { on: "bg-violet-500", icon: "text-violet-400" },
  emerald: { on: "bg-emerald-500", icon: "text-emerald-400" },
};

function Switch({
  on,
  onChange,
  disabled,
  accent,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accent: Accent;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${
        on ? ACCENT[accent].on : "bg-white/15"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function Row({
  icon,
  title,
  desc,
  on,
  onChange,
  disabled,
  accent,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accent: Accent;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${on ? ACCENT[accent].icon : "text-white/30"}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
      </div>
      <Switch on={on} onChange={onChange} disabled={disabled} accent={accent} />
    </div>
  );
}

interface Props {
  refine: boolean;
  onRefineChange: (v: boolean) => void;
  exportToCloud: boolean;
  onExportChange: (v: boolean) => void;
  disabled?: boolean;
}

/** Step 2 — processing options: AI correction and Google Drive export. */
export default function OptionsPanel({
  refine,
  onRefineChange,
  exportToCloud,
  onExportChange,
  disabled,
}: Props) {
  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          2
        </span>
        <h2 className="text-lg font-semibold">處理選項</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-2">開始前先確認設定。</p>

      <div className="divide-y divide-white/5">
        <Row
          icon={<Sparkles className="w-5 h-5" />}
          title="AI 校正逐字稿"
          desc="用 AI 修正同音字、專有名詞與標點(需設定 Gemini 金鑰)"
          on={refine}
          onChange={onRefineChange}
          disabled={disabled}
          accent="violet"
        />
        <Row
          icon={<Cloud className="w-5 h-5" />}
          title="存到 Google Drive"
          desc="處理完成後,把檔案上傳到你自己的雲端硬碟"
          on={exportToCloud}
          onChange={onExportChange}
          disabled={disabled}
          accent="emerald"
        />
        {/* Drive connection — always shown so the user can sign in to Google
            ahead of time, whether or not the export toggle is currently on. */}
        <div className="pl-8 py-3.5">
          <DriveConnect />
        </div>
      </div>
    </section>
  );
}
