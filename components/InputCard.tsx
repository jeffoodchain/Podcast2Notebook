"use client";
import { useRef } from "react";
import { Link2, Upload, FileAudio, X } from "lucide-react";

interface Props {
  mode: "url" | "file";
  onModeChange: (m: "url" | "file") => void;
  url: string;
  onUrlChange: (u: string) => void;
  file: File | null;
  onFileChange: (f: File | null) => void;
  disabled?: boolean;
}

/** Step 1 — choose the podcast source: a link, or an uploaded audio file. */
export default function InputCard({
  mode,
  onModeChange,
  url,
  onUrlChange,
  file,
  onFileChange,
  disabled,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tab = (m: "url" | "file", label: string, Icon: typeof Link2) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onModeChange(m)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        mode === m
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-white"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          1
        </span>
        <h2 className="text-lg font-semibold">選擇來源</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        要轉成逐字稿的 podcast 從哪裡來?
      </p>

      <div className="flex gap-1.5 p-1 bg-black/30 rounded-xl mb-4">
        {tab("url", "貼連結", Link2)}
        {tab("file", "上傳音檔", Upload)}
      </div>

      {mode === "url" ? (
        <div>
          <input
            type="url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            disabled={disabled}
            placeholder="貼上 podcast 連結…"
            className="w-full h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none transition-colors focus:border-primary disabled:opacity-50"
          />
          <p className="text-xs text-muted-foreground mt-2">
            支援 Apple Podcasts 單集網址、RSS feed,或直接的 MP3／M4A 連結。
          </p>
        </div>
      ) : (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
            file
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-white/10 hover:border-white/25"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".mp3,.mp4,.wav,.m4a"
            className="hidden"
            disabled={disabled}
            onChange={(e) =>
              e.target.files?.[0] && onFileChange(e.target.files[0])
            }
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileAudio className="w-9 h-9 text-emerald-400" />
              <p className="text-sm font-medium break-all">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileChange(null);
                }}
                className="mt-1 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> 移除
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-9 h-9 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">點此選擇,或把檔案拖進來</p>
              <p className="text-xs text-muted-foreground mt-1">
                MP3、M4A、WAV、MP4 — 上限 200MB
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
