"use client";
import { ProcessingState } from "../lib/types";
import { Check, Loader2, AlertCircle } from "lucide-react";

const STEPS = [
  { id: "parsing", label: "解析來源" },
  { id: "downloading", label: "下載音檔" },
  { id: "transcribing", label: "轉錄音檔" },
  { id: "refining", label: "AI 校正逐字稿" },
  { id: "generating", label: "產生筆記與檔案" },
];

export default function ProgressCard({ state }: { state: ProcessingState }) {
  if (state.status === "idle") return null;

  if (state.status === "error") {
    return (
      <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-300">處理失敗</h2>
        </div>
        <p className="text-sm text-red-300/80">
          {state.message || "發生未知的錯誤。"}
        </p>
        <p className="text-xs text-red-300/50 mt-2">
          可以調整來源或選項後再試一次。
        </p>
      </section>
    );
  }

  const done = state.status === "completed";
  const currentIdx = STEPS.findIndex((s) => s.id === state.status);
  const hasProgress = typeof state.progress === "number" && state.progress > 0;

  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        {done ? (
          <Check className="w-5 h-5 text-emerald-400" />
        ) : (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        )}
        <h2 className="text-lg font-semibold">{done ? "處理完成" : "處理中…"}</h2>
      </div>

      <div className="space-y-1">
        {STEPS.map((step, idx) => {
          const stepDone = done || currentIdx > idx;
          const active = !done && state.status === step.id;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 py-2 ${
                !stepDone && !active ? "opacity-35" : ""
              }`}
            >
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs font-bold ${
                  stepDone
                    ? "bg-emerald-500 text-black"
                    : active
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-white/30"
                }`}
              >
                {stepDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : active ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  idx + 1
                )}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    active
                      ? "text-white font-medium"
                      : stepDone
                        ? "text-white/70"
                        : "text-white/40"
                  }`}
                >
                  {step.label}
                </p>
                {active && hasProgress && (
                  <div className="mt-1.5 h-1 w-full max-w-xs bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {active && hasProgress && (
                <span className="text-xs text-primary tabular-nums">
                  {state.progress}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {!done && state.message && (
        <p className="mt-4 text-xs text-muted-foreground">{state.message}</p>
      )}
      {done && (
        <p className="mt-4 text-sm text-emerald-400">
          所有檔案已產生 — 請看下方結果。
        </p>
      )}
    </section>
  );
}
