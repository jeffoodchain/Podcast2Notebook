"use client";
import { ProcessingState } from "../lib/types";
import { motion, AnimatePresence } from "framer-motion";

export default function ProgressCard({ state }: { state: ProcessingState }) {
  if (state.status === "idle") return null;

  const steps = [
    { id: "parsing", label: "Parsing source", code: "01" },
    { id: "downloading", label: "Downloading audio", code: "02" },
    { id: "transcribing", label: "Transcribing audio", code: "03" },
    { id: "generating", label: "Generating content", code: "04" },
    { id: "completed", label: "Completed", code: "05" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === state.status);
  
  if (state.status === "error") {
    return (
      <div className="bg-red-950/20 text-red-500 border border-red-500/30 p-6 rounded-lg shadow-[0_0_20px_rgba(239,68,68,0.1)] mt-6 font-mono">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          SYSTEM_ERROR
        </h2>
        <p className="text-sm opacity-80">{state.message || "An unknown error occurred."}</p>
      </div>
    );
  }

  return (
    <div className="relative bg-[#05070a] border border-white/5 rounded-xl overflow-hidden shadow-2xl p-8 font-mono">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
      
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-full opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <div className="relative z-10 space-y-10">
        <div className="flex justify-between items-start border-b border-white/5 pb-4">
          <div>
            <h2 className="text-xs font-bold text-blue-500/80 tracking-[0.3em] uppercase mb-1">Neural Pipeline Active</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">System_Sync: Active</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-white/20 uppercase">Version_0.1.0</span>
          </div>
        </div>

        <div className="space-y-8">
          {steps.map((step, idx) => {
            const isCompleted = currentStepIndex > idx || state.status === "completed";
            const isCurrent = state.status === step.id;
            const isPending = currentStepIndex < idx && state.status !== "completed";

            return (
              <div key={step.id} className={`transition-all duration-500 ${isPending ? "opacity-20 grayscale" : "opacity-100"}`}>
                <div className="flex items-start gap-6">
                  {/* Step Number Square */}
                  <div className={`
                    w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl border-2 transition-all duration-700
                    ${isCompleted ? "bg-blue-500 border-blue-500 text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]" : 
                      isCurrent ? "border-blue-500 text-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] animate-pulse" : 
                      "border-white/10 text-white/20"}
                  `}>
                    <span className="text-lg font-bold tracking-tighter">
                      {isCompleted ? "✓" : step.code}
                    </span>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 pt-1">
                    <div className="flex flex-col mb-3">
                      <h3 className={`text-lg font-black uppercase tracking-wider transition-colors duration-500 ${
                        isCurrent ? "text-white" : isCompleted ? "text-blue-500/60" : "text-white/20"
                      }`}>
                        {step.label}
                      </h3>
                      {isCurrent && (
                        <motion.span 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]"
                        >
                          Executing_Task...
                        </motion.span>
                      )}
                    </div>

                    {/* Progress Bar & Stats (Only for current step) */}
                    <AnimatePresence>
                      {isCurrent && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 max-w-2xl">
                            {/* Thin Progress Bar */}
                            <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden mb-3">
                              <motion.div 
                                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${state.progress || 0}%` }}
                                transition={{ type: "spring", stiffness: 50, damping: 20 }}
                              />
                            </div>
                            
                            {/* Technical Metadata */}
                            <div className="flex justify-between items-center text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                              <div className="flex gap-4">
                                <span>Byte_Stream: <span className="text-white/70">{( (state.progress || 0) * 1.23).toFixed(2)}</span></span>
                                <span>Load: <span className="text-white/70">{state.progress || 0}%</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                                <span>Sync: <span className="text-blue-400">OK</span></span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* System Message Log */}
        {state.message && state.status !== "completed" && (
          <div className="mt-10 p-4 bg-white/5 border border-white/5 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">System_Log</span>
            </div>
            <p className="text-[11px] text-white/60 leading-relaxed uppercase">
              {state.message}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

