"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import InputCard from "../components/InputCard";
import OptionsPanel from "../components/OptionsPanel";
import MetadataCard from "../components/MetadataCard";
import ProgressCard from "../components/ProgressCard";
import OutputFilesCard from "../components/OutputFilesCard";
import { ProcessingState } from "../lib/types";

export default function Home() {
  const [mode, setMode] = useState<"url" | "file">("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [refine, setRefine] = useState(true);
  const [exportToCloud, setExportToCloud] = useState(false);
  const [state, setState] = useState<ProcessingState>({ status: "idle" });

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);

  const isLoading =
    state.status !== "idle" &&
    state.status !== "completed" &&
    state.status !== "error";

  const canStart =
    !isLoading && (mode === "url" ? url.trim().length > 0 : file !== null);

  // The OAuth connect is a full-page redirect that resets component state.
  // Landing back on `?drive=connected` means the user just connected their
  // Drive — re-enable the Sync to Drive option for them.
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("drive") === "connected"
    ) {
      setExportToCloud(true);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Bring the relevant section into view as the job moves through its stages.
  useEffect(() => {
    if (state.status === "completed") {
      outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (state.status !== "idle") {
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [state.status]);

  // Polls a job until it reaches a terminal state, mirroring it into `state`.
  const pollJob = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) return;
        const job = await res.json();
        setState({
          status: job.status,
          message: job.message,
          progress: job.progress,
          metadata: job.metadata,
          fileId: job.fileId,
          jobId: job.id,
          outputFiles: job.outputFiles,
          driveLinks: job.driveLinks,
        });
        if (job.status === "completed" || job.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error("Job polling error", e);
      }
    }, 2000);
  };

  const startUrlJob = async () => {
    setState({ status: "queued", message: "正在建立處理工作…" });
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url.trim(), refine, exportToCloud }),
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "無法建立處理工作。");
    }
    return (await res.json()).jobId as string;
  };

  const startFileJob = async () => {
    setState({ status: "queued", message: "正在上傳音檔…" });
    const formData = new FormData();
    formData.append("file", file as File);
    formData.append("refine", String(refine));
    formData.append("exportToCloud", String(exportToCloud));
    const res = await fetch("/api/jobs", { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error((await res.json()).error || "無法建立處理工作。");
    }
    return (await res.json()).jobId as string;
  };

  const handleStart = async () => {
    if (!canStart) return;
    try {
      const jobId = mode === "url" ? await startUrlJob() : await startFileJob();
      pollJob(jobId);
    } catch (error: any) {
      setState({
        status: "error",
        message: error.message || "發生未預期的錯誤。",
      });
    }
  };

  return (
    <main className="relative min-h-screen text-white">
      <div className="relative z-10 mx-auto max-w-2xl px-5 py-12 md:py-16 space-y-6">
        <header className="text-center space-y-2 mb-2">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Podcast<span className="text-primary">2</span>Notebook
          </h1>
          <p className="text-sm text-muted-foreground">
            把 podcast 轉成逐字稿、筆記、簡報與心智圖。
          </p>
        </header>

        <InputCard
          mode={mode}
          onModeChange={setMode}
          url={url}
          onUrlChange={setUrl}
          file={file}
          onFileChange={setFile}
          disabled={isLoading}
        />

        <OptionsPanel
          refine={refine}
          onRefineChange={setRefine}
          exportToCloud={exportToCloud}
          onExportChange={setExportToCloud}
          disabled={isLoading}
        />

        <button
          type="button"
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-3.5 rounded-2xl font-bold text-base bg-primary text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              處理中…
            </>
          ) : (
            "開始處理"
          )}
        </button>

        <div ref={progressRef} className="space-y-6 scroll-mt-6">
          <ProgressCard state={state} />
          {state.metadata && <MetadataCard metadata={state.metadata} />}
        </div>

        <div ref={outputRef} className="scroll-mt-6">
          <OutputFilesCard state={state} />
        </div>
      </div>
    </main>
  );
}
