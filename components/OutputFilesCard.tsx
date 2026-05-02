"use client";
import { ProcessingState } from "../lib/types";

export default function OutputFilesCard({ state }: { state: ProcessingState }) {
  if (state.status !== "completed" || !state.outputFiles) return null;

  const { outputFiles } = state;

  const downloadAll = () => {
    // In MVP, we can just open multiple links or trigger multiple downloads
    // A better approach for future is a zip file endpoint
    Object.values(outputFiles).forEach((url) => {
      if (url) {
        window.open(url, "_blank");
      }
    });
  };

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm mt-6">
      <h2 className="text-xl font-semibold mb-4">Processing Completed</h2>
      <p className="text-sm text-muted-foreground mb-4">Your podcast has been successfully processed into notes, slides, and mind maps.</p>
      
      {state.driveLinks && Object.keys(state.driveLinks).length > 0 && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-emerald-400 font-medium">Successfully exported to Google Drive</p>
          </div>
          <a 
            href={Object.values(state.driveLinks)[0]} 
            target="_blank" 
            rel="noreferrer"
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
          >
            View on Drive
          </a>
        </div>
      )}
      
      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={downloadAll} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium">
          Download All
        </button>
        {outputFiles.notebooklmSourceUrl && (
          <a href={outputFiles.notebooklmSourceUrl} download className="bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium">
            Download NotebookLM Source
          </a>
        )}
        <a href="https://notebooklm.google.com" target="_blank" rel="noreferrer" className="bg-[#1e40af] text-white hover:bg-[#1e3a8a] px-4 py-2 rounded-md text-sm font-medium">
          Open NotebookLM
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {outputFiles.transcriptTextUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Original Transcript (.txt)</span>
            <a href={outputFiles.transcriptTextUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
        {outputFiles.transcriptMdUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Cleaned Transcript (.md)</span>
            <a href={outputFiles.transcriptMdUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
        {outputFiles.summaryUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Summary (.md)</span>
            <a href={outputFiles.summaryUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
        {outputFiles.notesUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Structured Notes (.md)</span>
            <a href={outputFiles.notesUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
        {outputFiles.slidesUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Presentation Slides (.pptx)</span>
            <a href={outputFiles.slidesUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
        {outputFiles.mindmapHtmlUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Mind Map (Interactive)</span>
            <a href={outputFiles.mindmapHtmlUrl} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline">View</a>
          </div>
        )}
        {outputFiles.mindmapMdUrl && (
          <div className="border p-4 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium">Mind Map (.md)</span>
            <a href={outputFiles.mindmapMdUrl} download className="text-primary text-sm hover:underline">Download</a>
          </div>
        )}
      </div>
    </div>
  );
}
