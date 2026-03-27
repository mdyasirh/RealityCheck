"use client";

import React, { useEffect, useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { pollForResult, type ScanResult } from "@/lib/api";

const SCAN_STEPS = [
  "Initializing deep analysis engine...",
  "Extracting metadata signatures...",
  "Analyzing pixel-level artifacts...",
  "Running GAN detection models...",
  "Cross-referencing frequency patterns...",
  "Compiling reality assessment...",
];

interface ScanningLoaderProps {
  scanId: string;
  onComplete: (result: ScanResult) => void;
  onError: (message: string) => void;
}

export function ScanningLoader({ scanId, onComplete, onError }: ScanningLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const completedRef = useRef(false);

  // Animate the progress bar independently of the actual poll
  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      // Slow down as we approach 90% — the last 10% waits for the real result
      if (current < 90) {
        current += 0.5;
      }
      setProgress(current);
      setStepIndex(
        Math.min(Math.floor((current / 100) * SCAN_STEPS.length), SCAN_STEPS.length - 1),
      );
    }, 100);

    return () => clearInterval(timer);
  }, []);

  // Poll the backend for the real result
  useEffect(() => {
    let cancelled = false;

    pollForResult(scanId, 2000, 90)
      .then((result) => {
        if (cancelled || completedRef.current) return;
        completedRef.current = true;
        // Fill the progress bar to 100%, then fire onComplete
        setProgress(100);
        setStepIndex(SCAN_STEPS.length - 1);
        setTimeout(() => onComplete(result), 600);
      })
      .catch((err) => {
        if (cancelled) return;
        onError(err instanceof Error ? err.message : "Analysis failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [scanId, onComplete, onError]);

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-8 animate-fade-in-up">
      {/* Radar animation */}
      <div className="relative flex items-center justify-center w-40 h-40">
        <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse-ring" />
        <div
          className="absolute inset-4 rounded-full border border-primary/30 animate-pulse-ring"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute inset-8 rounded-full border border-primary/40 animate-pulse-ring"
          style={{ animationDelay: "1s" }}
        />

        <div className="absolute inset-0 animate-radar-spin">
          <div
            className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
            style={{
              background: "linear-gradient(90deg, hsl(210 40% 98% / 0.8), transparent)",
            }}
          />
        </div>

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
