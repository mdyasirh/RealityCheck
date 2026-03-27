"use client";

import React, { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

const SCAN_STEPS = [
  "Initializing deep analysis engine...",
  "Extracting metadata signatures...",
  "Analyzing pixel-level artifacts...",
  "Running GAN detection models...",
  "Cross-referencing frequency patterns...",
  "Compiling reality assessment...",
];

interface ScanningLoaderProps {
  onComplete: () => void;
}

export function ScanningLoader({ onComplete }: ScanningLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const duration = 4000;
    const interval = 50;
    const increment = 100 / (duration / interval);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        clearInterval(timer);
        setTimeout(onComplete, 400);
      }
      setProgress(current);
      setStepIndex(Math.min(Math.floor((current / 100) * SCAN_STEPS.length), SCAN_STEPS.length - 1));
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-8 animate-fade-in-up">
      {/* Radar animation */}
      <div className="relative flex items-center justify-center w-40 h-40">
        {/* Pulsing rings */}
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
        <div
          className="absolute inset-4 rounded-full border border-primary/30 animate-pulse-ring"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute inset-8 rounded-full border border-primary/40 animate-pulse-ring"
          style={{ animationDelay: "1s" }}
        />

        {/* Radar sweep */}
        <div className="absolute inset-0 animate-radar-spin">
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
            style={{
              background: "linear-gradient(90deg, hsl(210 40% 98% / 0.8), transparent)",
            }}
          />
        </div>

        {/* Center dot */}
        <div className="relative z-10 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-3">
        <Progress value={progress} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="transition-all duration-300">{SCAN_STEPS[stepIndex]}</span>
          <span className="font-mono">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
