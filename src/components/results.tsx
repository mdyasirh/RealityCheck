"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultsProps {
  fileName: string;
  onReset: () => void;
}

function generateMockScore() {
  return Math.floor(Math.random() * 60) + 20; // 20-79 range for interesting results
}

function getVerdict(score: number) {
  if (score >= 70) return { label: "Likely AI-Generated", color: "text-red-400", bg: "bg-red-400" };
  if (score >= 40) return { label: "Inconclusive", color: "text-yellow-400", bg: "bg-yellow-400" };
  return { label: "Likely Authentic", color: "text-emerald-400", bg: "bg-emerald-400" };
}

const MOCK_DETAILS = [
  { label: "Metadata Consistency", getScore: () => Math.floor(Math.random() * 40) + 60 },
  { label: "GAN Artifact Detection", getScore: () => Math.floor(Math.random() * 50) + 30 },
  { label: "Frequency Analysis", getScore: () => Math.floor(Math.random() * 45) + 40 },
  { label: "Noise Pattern Analysis", getScore: () => Math.floor(Math.random() * 50) + 35 },
];

export function Results({ fileName, onReset }: ResultsProps) {
  const [score] = useState(generateMockScore);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [details] = useState(() => MOCK_DETAILS.map((d) => ({ label: d.label, score: d.getScore() })));
  const verdict = getVerdict(score);

  useEffect(() => {
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      if (current >= score) {
        current = score;
        clearInterval(timer);
      }
      setAnimatedScore(current);
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardDescription className="text-xs font-mono uppercase tracking-wider mb-2">
            Analysis Complete
          </CardDescription>
          <CardTitle className="text-xl">{fileName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score circle */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="8"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="64"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedScore / 100) * 402} 402`}
                  className={cn("transition-all duration-300", verdict.color)}
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-bold font-mono">{animatedScore}</span>
                <span className="text-sm text-muted-foreground block">/100</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {score >= 70 ? (
                <ShieldAlert className={cn("h-5 w-5", verdict.color)} />
              ) : (
                <ShieldCheck className={cn("h-5 w-5", verdict.color)} />
              )}
              <span className={cn("text-sm font-semibold", verdict.color)}>
                {verdict.label}
              </span>
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Reality Score indicates the likelihood of AI generation. Higher scores suggest artificial origin.
            </p>
          </div>

          {/* Detail breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Breakdown
            </h4>
            {details.map((detail) => {
              const detailVerdict = getVerdict(detail.score);
              return (
                <div key={detail.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{detail.label}</span>
                    <span className={cn("font-mono text-xs", detailVerdict.color)}>
                      {detail.score}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", detailVerdict.bg)}
                      style={{ width: `${detail.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Analyze Another File
      </Button>
    </div>
  );
}
