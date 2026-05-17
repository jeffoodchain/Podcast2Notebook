"use client";
import { ProcessingState } from "../lib/types";
import { Download, ExternalLink, FileText } from "lucide-react";

export default function OutputFilesCard({ state }: { state: ProcessingState }) {
  if (state.status !== "completed" || !state.outputFiles) return null;

  const { outputFiles } = state;

  const downloadAll = () => {
    Object.values(outputFiles).forEach((url) => {
      if (url) window.open(url, "_blank");
    });
  };

  // `view: true` opens in a new tab (interactive HTML); otherwise downloads.
  const fileItems = [
    { url: outputFiles.transcriptTextUrl, label: "逐字稿(.txt)", view: false },
    { url: outputFiles.transcriptMdUrl, label: "逐字稿含時間戳(.md)", view: false },
    { url: outputFiles.summaryUrl, label: "摘要(.md)", view: false },
    { url: outputFiles.notesUrl, label: "重點筆記(.md)", view: false },
    { url: outputFiles.slidesUrl, label: "簡報(.pptx)", view: false },
    { url: outputFiles.mindmapHtmlUrl, label: "心智圖(互動網頁)", view: true },
    { url: outputFiles.mindmapMdUrl, label: "心智圖(.md)", view: false },
  ].filter((f) => f.url);

  const driveLinkCount = state.driveLinks
    ? Object.keys(state.driveLinks).length
    : 0;

  return (
    <section className="glass-card rounded-2xl p-6">
      <h2 className="text-lg font-semibold mb-1">產出檔案</h2>
      <p className="text-sm text-muted-foreground mb-5">
        這集 podcast 已轉成逐字稿、筆記、簡報與心智圖。
      </p>

      {driveLinkCount > 0 && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <p className="text-sm text-emerald-400 font-medium">
              已上傳到你的 Google Drive
            </p>
          </div>
          <a
            href={Object.values(state.driveLinks!)[0]}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-400 hover:underline shrink-0"
          >
            前往 Drive 查看
          </a>
        </div>
      )}

      {/* NotebookLM — manual upload. NotebookLM has no consumer API, so the
          flow is: download the generated source file, then add it by hand. */}
      {outputFiles.notebooklmSourceUrl && (
        <div className="mb-6 rounded-lg border border-blue-500/30 bg-blue-500/5 p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold">上傳到 NotebookLM</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            NotebookLM 沒有上傳 API,需手動加來源,兩個步驟:
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={outputFiles.notebooklmSourceUrl}
              download
              className="flex items-center justify-center gap-2 flex-1 bg-[#1e40af] text-white hover:bg-[#1e3a8a] px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              1. 下載來源檔
            </a>
            <a
              href="https://notebooklm.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 flex-1 border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 px-4 py-2.5 rounded-md text-sm font-medium transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              2. 開啟 NotebookLM 並加為來源
            </a>
          </div>
        </div>
      )}

      <button
        onClick={downloadAll}
        className="mb-6 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium"
      >
        全部下載
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fileItems.map((f) => (
          <div
            key={f.label}
            className="border border-white/10 p-4 rounded-lg flex justify-between items-center gap-3"
          >
            <span className="text-sm font-medium">{f.label}</span>
            <a
              href={f.url}
              {...(f.view
                ? { target: "_blank", rel: "noreferrer" }
                : { download: true })}
              className="text-primary text-sm hover:underline shrink-0"
            >
              {f.view ? "開啟" : "下載"}
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
