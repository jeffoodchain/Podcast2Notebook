"use client";
import { useState } from "react";
import UrlInputCard from "../components/UrlInputCard";
import FileUploadCard from "../components/FileUploadCard";
import ExportToggle from "../components/ExportToggle";
import MetadataCard from "../components/MetadataCard";
import ProgressCard from "../components/ProgressCard";
import OutputFilesCard from "../components/OutputFilesCard";
import { ProcessingState, PodcastMetadata } from "../lib/types";
import { useEffect } from "react";

export default function Home() {
  const [state, setState] = useState<ProcessingState>({ status: "idle" });
  const [exportToCloud, setExportToCloud] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state.status === "transcribing" && state.fileId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/progress?fileId=${state.fileId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.total_time) {
              const current = data.current_time || 0;
              const percentage = Math.round((current / data.total_time) * 100);
              setState((prev) => ({ ...prev, progress: percentage }));
            }
          }
        } catch (e) {
          console.error("Progress polling error", e);
        }
      }, 2000); // Polling every 2 seconds for smoother updates
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state.status, state.fileId]);

  const runCommonProcessing = async (fileId: string, metadata: PodcastMetadata, cloudExport: boolean) => {
    // Step 3: Transcribe
    setState((prev) => ({ ...prev, status: "transcribing", fileId, progress: 0, message: "Initializing neural transcription engine..." }));
    const transcribeRes = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    
    if (!transcribeRes.ok) {
      const errorData = await transcribeRes.json();
      throw new Error(errorData.error || "Transcription failed. Please ensure the Python service is running and try again.");
    }
    const { transcript, segments } = await transcribeRes.json();
    
    // Step 4: Generate Content
    setState((prev) => ({ ...prev, status: "generating", message: "Synthesizing notes and knowledge graphs..." }));
    const generateRes = await fetch("/api/generate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata, transcript, segments, fileId, exportToCloud: cloudExport }),
    });
    
    if (!generateRes.ok) {
      const errorData = await generateRes.json();
      throw new Error(errorData.error || "Failed to generate content.");
    }
    const { files, driveLinks } = await generateRes.json();
    
    setState((prev) => ({ 
      ...prev, 
      status: "completed", 
      outputFiles: files,
      driveLinks
    }));
  };

  const startProcessing = async (url: string) => {
    try {
      setState({ status: "parsing", message: "Accessing remote stream metadata...", exportToCloud });
      
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!parseRes.ok) throw new Error("Failed to parse podcast source.");
      const metadata = await parseRes.json();
      setState((prev) => ({ ...prev, status: "downloading", metadata, message: "Streaming audio to local buffer..." }));

      const downloadRes = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audioUrl: metadata.audioUrl, metadata }),
      });
      if (!downloadRes.ok) throw new Error("Failed to download audio file.");
      const { fileId, fileName } = await downloadRes.json();

      const localAudioUrl = `/api/files/audio/${fileName}`;
      setState((prev) => ({ 
        ...prev, 
        metadata: prev.metadata ? { ...prev.metadata, audioUrl: localAudioUrl } : undefined 
      }));

      await runCommonProcessing(fileId, metadata, exportToCloud);

    } catch (error: any) {
      setState({ status: "error", message: error.message || "An unexpected error occurred." });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setState({ status: "parsing", message: "Uploading local data packets...", exportToCloud });
      
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!uploadRes.ok) throw new Error("Failed to upload file.");
      const { fileId, metadata } = await uploadRes.json();
      
      setState((prev) => ({ ...prev, metadata }));

      await runCommonProcessing(fileId, metadata, exportToCloud);

    } catch (error: any) {
      setState({ status: "error", message: error.message || "An unexpected error occurred." });
    }
  };

  const isLoading = state.status !== "idle" && state.status !== "completed" && state.status !== "error";

  return (
    <main className="relative min-h-screen bg-[#020408] text-white selection:bg-blue-500/30">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#1e3a8a_0%,transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.05]" 
          style={{ backgroundImage: "linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      <div className="relative z-10 p-8 md:p-16 max-w-5xl mx-auto space-y-12">
        <header className="text-center space-y-6">
          <div className="inline-block px-3 py-1 border border-blue-500/30 bg-blue-500/10 rounded-full text-[10px] font-mono text-blue-400 uppercase tracking-[0.3em] mb-4">
            Neural Content Processor v0.1
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">
            Podcast<span className="text-blue-500 text-glow-blue">2</span>Notebook
          </h1>
          <p className="text-sm md:text-base text-white/40 max-w-xl mx-auto font-light leading-relaxed tracking-wide">
            Transforming raw audio streams into structured intelligence using advanced neural transcription and generative synthesis.
          </p>
          
          <div className="flex justify-center pt-6">
            <ExportToggle 
              enabled={exportToCloud} 
              onChange={setExportToCloud} 
              disabled={isLoading}
            />
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <UrlInputCard onProcess={startProcessing} state={state} />
          <FileUploadCard onUpload={handleFileUpload} state={state} />
        </section>

        <section className="space-y-8">
          {state.metadata && <MetadataCard metadata={state.metadata} />}
          <ProgressCard state={state} />
          <OutputFilesCard state={state} />
        </section>
      </div>

      <style jsx global>{`
        .text-glow-blue {
          text-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </main>
  );
}

