import React, { useState } from "react";
import { cn } from "../utils/cn";

const metrics = [
  { key: "BQ", label: "Business Quality", desc: "Moat, pricing power, scalability" },
  { key: "RP", label: "Return Profile", desc: "ROE, ROCE, capital efficiency" },
  { key: "CY", label: "Cyclicality", desc: "Revenue stability, demand sensitivity" },
  { key: "BG", label: "Governance", desc: "Management quality, transparency" },
];

export default function ScoreCard({ scores, className }) {
  const [flippedKey, setFlippedKey] = useState(null);

  if (!scores) return null;

  const toggleFlip = (key) => {
    setFlippedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch", className)}>
      {metrics.map((m) => {
        const data = scores[m.key];
        if (!data) return null;

        const isFlipped = flippedKey === m.key;
        const reasoningPoints = Array.isArray(data.justification) ? data.justification : [];

        return (
          <div key={m.key} className="w-full [perspective:1400px]">
            <div
              className={cn(
                "relative min-h-[290px] w-full transition-transform duration-700 ease-[cubic-bezier(.2,.8,.2,1)]",
                "[transform-style:preserve-3d]",
                isFlipped && "[transform:rotateY(180deg)]"
              )}
            >
              {/* FRONT */}
              <div
                className={cn(
                 "absolute inset-0 rounded-3xl",
    "bg-[#0f172a]/90 backdrop-blur-xl",
    "border border-white/10",
    "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
    "p-6 flex flex-col justify-between overflow-hidden",
    "transition-all duration-300 hover:border-blue-400/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
    "[backface-visibility:hidden]"
                )}
              >
                {/* subtle decorative glow */}
                <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-cyan-400/10 blur-3xl" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-300">
                      {m.key}
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-white">
                      {m.label}
                    </h3>
                    <p className="mt-2 max-w-[18rem] text-sm leading-6 text-slate-400">
                      {m.desc}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner">
                    <div className="text-5xl font-black tracking-tighter text-white">
                      {data.val !== null && data.val !== undefined ? data.val : "—"}
                    </div>
                  </div>
                </div>

                <div className="relative mt-6 flex items-center justify-between gap-4">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                    Tap to view reasoning
                  </div>

                  <button
                    onClick={() => toggleFlip(m.key)}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-blue-200 transition-all hover:bg-blue-400/15 hover:border-blue-300/30 hover:text-white"
                  >
                    View Reasoning
                    <span className="text-[10px] leading-none">↻</span>
                  </button>
                </div>
              </div>

              {/* BACK */}
              <div
                className={cn(
                  "absolute inset-0 rounded-3xl",
    "bg-blue",
    "border border-white/10",
    "shadow-[0_10px_30px_rgba(0,0,0,0.35)]",
    "p-6 flex flex-col overflow-hidden",
    "transition-all duration-300 hover:border-blue-400/30",
    "[backface-visibility:hidden] [transform:rotateY(180deg)]"
                )}
              >
                <div className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

                <div className="relative mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-blue-300">
                      {m.key} Reasoning
                    </div>
                    <h3 className="text-xl font-semibold tracking-tight text-white">
                      {m.label}
                    </h3>
                  </div>

                  <button
                    onClick={() => toggleFlip(m.key)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-200 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Back
                    <span className="text-[10px] leading-none">↺</span>
                  </button>
                </div>

                <div className="relative flex-1 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  {reasoningPoints.length > 0 ? (
                    <ul className="space-y-3">
                      {reasoningPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm leading-6 text-slate-200">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.75)]" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm italic text-slate-400">
                      No reasoning points available.
                    </div>
                  )}
                </div>

                <div className="relative mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                  Click back to return to the score
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}