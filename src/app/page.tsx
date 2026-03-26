"use client";

import React, { useState, useCallback } from "react";
import { Shield, Image, Video, AudioLines, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/upload";
import { ScanningLoader } from "@/components/scanning-loader";
import { Results } from "@/components/results";

type AppState = "landing" | "upload" | "scanning" | "results";

const FEATURES = [
  {
    icon: Image,
    title: "Image Analysis",
    description: "Detect AI-generated photos, art, and manipulated images with pixel-level inspection.",
  },
  {
    icon: Video,
    title: "Video Detection",
    description: "Identify deepfake videos by analyzing temporal inconsistencies and facial artifacts.",
  },
  {
    icon: AudioLines,
    title: "Audio Verification",
    description: "Spot AI-synthesized voice clones and manipulated audio recordings.",
  },
];

export default function Home() {
  const [state, setState] = useState<AppState>("landing");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setState("scanning");
  }, []);

  const handleScanComplete = useCallback(() => {
    setState("results");
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setState("upload");
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <button
            onClick={() => {
              setState("landing");
              setSelectedFile(null);
            }}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Shield className="h-5 w-5 text-primary" />
            <span>RealityCheck</span>
          </button>
          {state === "landing" && (
            <Button size="sm" onClick={() => setState("upload")}>
              Try It Now
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Landing */}
        {state === "landing" && (
          <div className="flex flex-col">
            {/* Hero */}
            <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-20 pb-16 text-center md:pt-32 md:pb-24">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                AI-Powered Detection
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Is it{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Real
                </span>{" "}
                or{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                  AI-Generated
                </span>
                ?
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                Instantly verify if an image, video, or audio file is Real or
                AI-Generated. Upload your file and get a Reality Score in
                seconds.
              </p>
              <div className="flex gap-3 pt-2">
                <Button size="lg" onClick={() => setState("upload")}>
                  Start Checking
                </Button>
                <Button size="lg" variant="outline" onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}>
                  Learn More
                </Button>
              </div>
            </section>

            {/* Features */}
            <section
              id="features"
              className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 sm:grid-cols-3"
            >
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent/50"
                >
                  <feature.icon className="h-8 w-8 text-muted-foreground mb-3" />
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* Upload */}
        {state === "upload" && (
          <section className="mx-auto max-w-5xl px-4 pt-16 md:pt-24">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Upload Your File</h2>
              <p className="text-muted-foreground">
                Drag and drop or click to select an image, video, or audio file.
              </p>
            </div>
            <UploadZone onFileSelect={handleFileSelect} />
          </section>
        )}

        {/* Scanning */}
        {state === "scanning" && (
          <section className="mx-auto max-w-5xl px-4 pt-16 md:pt-24">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Analyzing Your File</h2>
              <p className="text-muted-foreground">
                Running deepfake detection models...
              </p>
            </div>
            <ScanningLoader onComplete={handleScanComplete} />
          </section>
        )}

        {/* Results */}
        {state === "results" && selectedFile && (
          <section className="mx-auto max-w-5xl px-4 pt-16 md:pt-24">
            <Results fileName={selectedFile.name} onReset={handleReset} />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 mt-auto">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
          <span>RealityCheck</span>
          <span>AI Deepfake Detection Tool</span>
        </div>
      </footer>
    </div>
  );
}
