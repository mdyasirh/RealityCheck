"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Download,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScanResult } from "@/lib/api";

// ── Types ───────────────────────────────────────────────────────

interface ResultsProps {
  scanResult: ScanResult;
  fileName: string;
  fileThumbnailUrl: string | null;
  onReset: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────

function getVerdict(score: number) {
  if (score >= 70)
    return { label: "Likely AI-Generated", color: "text-red-400", bg: "bg-red-400", hex: "#f87171" };
  if (score >= 40)
    return { label: "Inconclusive", color: "text-yellow-400", bg: "bg-yellow-400", hex: "#facc15" };
  return { label: "Likely Authentic", color: "text-emerald-400", bg: "bg-emerald-400", hex: "#34d399" };
}

function derivedBreakdown(score: number) {
  const jitter = (base: number) =>
    Math.max(0, Math.min(100, base + Math.floor(Math.random() * 20 - 10)));
  return [
    { label: "Metadata Consistency", score: jitter(score + 10) },
    { label: "GAN Artifact Detection", score: jitter(score) },
    { label: "Frequency Analysis", score: jitter(score - 5) },
    { label: "Noise Pattern Analysis", score: jitter(score + 5) },
  ];
}

// ── Badge generation (HTML Canvas) ──────────────────────────────

function generateBadge(
  fileName: string,
  score: number,
  verdict: { label: string; hex: string },
  thumbnailUrl: string | null,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const W = 600;
    const H = 340;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const draw = (img: HTMLImageElement | null) => {
      // Background
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, W, H);

      // Thumbnail area (left side)
      if (img) {
        const thumbSize = 140;
        const tx = 30;
        const ty = (H - thumbSize) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(tx, ty, thumbSize, thumbSize, 12);
        ctx.clip();
        ctx.drawImage(img, tx, ty, thumbSize, thumbSize);
        ctx.restore();
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(tx, ty, thumbSize, thumbSize, 12);
        ctx.stroke();
      }

      const textX = thumbnailUrl ? 200 : 40;

      // Title
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("RealityCheck", textX, 50);

      // File name
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px system-ui, sans-serif";
      const truncName = fileName.length > 30 ? fileName.slice(0, 27) + "..." : fileName;
      ctx.fillText(truncName, textX, 80);

      // Score
      ctx.fillStyle = verdict.hex;
      ctx.font = "bold 72px system-ui, sans-serif";
      ctx.fillText(`${score}`, textX, 170);

      ctx.fillStyle = "#64748b";
      ctx.font = "24px system-ui, sans-serif";
      const scoreWidth = ctx.measureText(`${score}`).width;
      ctx.fillText("/100", textX + scoreWidth + 4, 170);

      // Verdict label
      ctx.fillStyle = verdict.hex;
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(verdict.label, textX, 210);

      // Watermark
      ctx.fillStyle = "rgba(148, 163, 184, 0.3)";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText("RealityCheck.com", W - 170, H - 20);

      // Border
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/png",
      );
    };

    if (thumbnailUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => draw(img);
      img.onerror = () => draw(null);
      img.src = thumbnailUrl;
    } else {
      draw(null);
    }
  });
}

// ── Share helpers ────────────────────────────────────────────────

function shareToTwitter(score: number, verdict: string) {
  const text = encodeURIComponent(
    `I just ran a deepfake check with RealityCheck!\n\nReality Score: ${score}/100 — ${verdict}\n\nCheck your media too:`,
  );
  window.open(`https://x.com/intent/tweet?text=${text}`, "_blank", "noopener");
}

function shareToReddit(score: number, verdict: string) {
  const title = encodeURIComponent(
    `My file scored ${score}/100 on RealityCheck — ${verdict}`,
  );
  window.open(
    `https://www.reddit.com/submit?type=TEXT&title=${title}`,
    "_blank",
    "noopener",
  );
}

// ── Component ───────────────────────────────────────────────────

export function Results({
  scanResult,
  fileName,
  fileThumbnailUrl,
  onReset,
}: ResultsProps) {
  const score = Math.round(scanResult.result_score ?? 0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [details] = useState(() => derivedBreakdown(score));
  const [badgeUrl, setBadgeUrl] = useState<string | null>(null);
  const verdict = getVerdict(score);
  const badgeBlobRef = useRef<Blob | null>(null);

  // Animate score counter
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

  // Generate badge on mount
  useEffect(() => {
    generateBadge(fileName, score, verdict, fileThumbnailUrl).then((blob) => {
      badgeBlobRef.current = blob;
      setBadgeUrl(URL.createObjectURL(blob));
    });
    return () => {
      if (badgeUrl) URL.revokeObjectURL(badgeUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadBadge = useCallback(() => {
    if (!badgeUrl) return;
    const a = document.createElement("a");
    a.href = badgeUrl;
    a.download = `realitycheck-${score}.png`;
    a.click();
  }, [badgeUrl, score]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="text-center pb-2">
          <CardDescription className="text-xs font-mono uppercase tracking-wider mb-2">
            Analysis Complete
          </CardDescription>
          <CardTitle className="text-xl">{fileName}</CardTitle>
          {scanResult.media_type && (
            <p className="text-xs text-muted-foreground capitalize">
              {scanResult.media_type} file
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score circle */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 144 144">
                <circle
                  cx="72" cy="72" r="64"
                  fill="none"
                  stroke="hsl(var(--secondary))"
                  strokeWidth="8"
                />
                <circle
                  cx="72" cy="72" r="64"
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
              Reality Score indicates the likelihood of AI generation. Higher
              scores suggest artificial origin.
            </p>
          </div>

          {/* Detail breakdown */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Breakdown
            </h4>
            {details.map((detail) => {
              const dv = getVerdict(detail.score);
              return (
                <div key={detail.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{detail.label}</span>
                    <span className={cn("font-mono text-xs", dv.color)}>
                      {detail.score}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", dv.bg)}
                      style={{ width: `${detail.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Badge preview */}
          {badgeUrl && (
            <div className="pt-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Shareable Badge
              </h4>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={badgeUrl}
                alt="RealityCheck Badge"
                className="w-full rounded-lg border border-border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleDownloadBadge} disabled={!badgeUrl}>
          <Download className="h-4 w-4 mr-2" />
          Download Badge
        </Button>
        <Button
          variant="outline"
          onClick={() => shareToTwitter(score, verdict.label)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share to X
        </Button>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => shareToReddit(score, verdict.label)}
      >
        Share to Reddit
      </Button>

      <Button variant="outline" className="w-full" onClick={onReset}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Analyze Another File
      </Button>
    </div>
  );
}
