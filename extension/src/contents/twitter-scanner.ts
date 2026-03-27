import type { PlasmoCSConfig } from "plasmo";
import { sendToBackground } from "@plasmohq/messaging";
import type { ScanRequest, ScanResponse } from "~/background/messages/scan";

export const config: PlasmoCSConfig = {
  matches: ["https://twitter.com/*", "https://x.com/*"],
  run_at: "document_idle",
};

// ── Constants ──────────────────────────────────────────────────

const BUTTON_ATTR = "data-rc-scan";
const POPOVER_ATTR = "data-rc-popover";

// ── Styles (injected once) ─────────────────────────────────────

function injectStyles() {
  if (document.getElementById("rc-styles")) return;

  const style = document.createElement("style");
  style.id = "rc-styles";
  style.textContent = `
    .rc-scan-btn {
      position: absolute;
      bottom: 8px;
      right: 8px;
      z-index: 10;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: rgba(0, 0, 0, 0.65);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      transition: background 0.2s, transform 0.15s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .rc-scan-btn:hover {
      background: rgba(0, 0, 0, 0.85);
      transform: scale(1.1);
    }
    .rc-scan-btn svg {
      width: 16px;
      height: 16px;
    }
    .rc-scan-btn.rc-loading {
      pointer-events: none;
      animation: rc-pulse 1s ease-in-out infinite;
    }
    @keyframes rc-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .rc-popover {
      position: absolute;
      bottom: 48px;
      right: 8px;
      z-index: 11;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 16px;
      min-width: 200px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #e2e8f0;
      animation: rc-fade-in 0.2s ease-out;
    }
    @keyframes rc-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .rc-popover-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      margin-bottom: 8px;
    }
    .rc-popover-score {
      font-size: 36px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .rc-popover-score span {
      font-size: 16px;
      color: #64748b;
    }
    .rc-popover-verdict {
      font-size: 13px;
      font-weight: 600;
      margin-top: 6px;
    }
    .rc-popover-bar {
      height: 4px;
      border-radius: 2px;
      background: #1e293b;
      margin-top: 10px;
      overflow: hidden;
    }
    .rc-popover-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.6s ease-out;
    }
    .rc-popover-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #94a3b8;
      font-size: 13px;
    }
    .rc-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid #334155;
      border-top-color: #e2e8f0;
      border-radius: 50%;
      animation: rc-spin 0.6s linear infinite;
    }
    @keyframes rc-spin {
      to { transform: rotate(360deg); }
    }
    .rc-popover-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px;
    }
    .rc-popover-close:hover { color: #e2e8f0; }
    .rc-popover-error { color: #f87171; font-size: 13px; }
  `;
  document.head.appendChild(style);
}

// ── SVG icons ──────────────────────────────────────────────────

const MAGNIFIER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;

// ── Helpers ────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 70) return "#f87171";   // red
  if (score >= 40) return "#facc15";   // yellow
  return "#34d399";                     // green
}

function getVerdict(score: number, isAi: boolean): string {
  if (score >= 70) return "Likely AI-Generated";
  if (score >= 40) return "Inconclusive";
  return "Likely Authentic";
}

function extractMediaUrl(el: HTMLElement): string | null {
  // <img> element
  if (el instanceof HTMLImageElement) {
    return el.src || el.currentSrc || null;
  }
  // <video> element
  if (el instanceof HTMLVideoElement) {
    if (el.src) return el.src;
    const source = el.querySelector("source");
    return source?.src ?? null;
  }
  // Background image
  const bg = getComputedStyle(el).backgroundImage;
  const match = bg.match(/url\(["']?(.*?)["']?\)/);
  return match?.[1] ?? null;
}

// ── Popover ────────────────────────────────────────────────────

function showPopover(
  container: HTMLElement,
  state: "loading" | "result" | "error",
  data?: { score?: number; isAi?: boolean; error?: string },
) {
  // Remove any existing popover in this container
  container.querySelector(`[${POPOVER_ATTR}]`)?.remove();

  const popover = document.createElement("div");
  popover.classList.add("rc-popover");
  popover.setAttribute(POPOVER_ATTR, "");

  const closeBtn = document.createElement("button");
  closeBtn.className = "rc-popover-close";
  closeBtn.textContent = "×";
  closeBtn.onclick = () => popover.remove();
  popover.appendChild(closeBtn);

  if (state === "loading") {
    const wrap = document.createElement("div");
    wrap.className = "rc-popover-loading";
    wrap.innerHTML = `<div class="rc-spinner"></div><span>Analyzing media...</span>`;
    popover.appendChild(wrap);
  } else if (state === "error") {
    const title = document.createElement("div");
    title.className = "rc-popover-title";
    title.textContent = "RealityCheck";
    popover.appendChild(title);

    const err = document.createElement("div");
    err.className = "rc-popover-error";
    err.textContent = data?.error ?? "Analysis failed";
    popover.appendChild(err);
  } else if (state === "result" && data) {
    const score = Math.round(data.score ?? 0);
    const color = getScoreColor(score);
    const verdict = getVerdict(score, data.isAi ?? false);

    const title = document.createElement("div");
    title.className = "rc-popover-title";
    title.textContent = "RealityCheck";
    popover.appendChild(title);

    const scoreEl = document.createElement("div");
    scoreEl.className = "rc-popover-score";
    scoreEl.style.color = color;
    scoreEl.innerHTML = `${score}<span>/100</span>`;
    popover.appendChild(scoreEl);

    const verdictEl = document.createElement("div");
    verdictEl.className = "rc-popover-verdict";
    verdictEl.style.color = color;
    verdictEl.textContent = verdict;
    popover.appendChild(verdictEl);

    const bar = document.createElement("div");
    bar.className = "rc-popover-bar";
    const fill = document.createElement("div");
    fill.className = "rc-popover-bar-fill";
    fill.style.backgroundColor = color;
    fill.style.width = "0%";
    bar.appendChild(fill);
    popover.appendChild(bar);

    // Animate the bar
    requestAnimationFrame(() => {
      fill.style.width = `${score}%`;
    });
  }

  container.appendChild(popover);
}

// ── Button injection ───────────────────────────────────────────

function injectButton(mediaEl: HTMLElement) {
  // Skip if already processed
  if (mediaEl.getAttribute(BUTTON_ATTR)) return;
  mediaEl.setAttribute(BUTTON_ATTR, "true");

  // The parent needs relative positioning for the absolute button
  const container = mediaEl.closest("[data-testid]") as HTMLElement | null;
  const wrapper = container ?? mediaEl.parentElement;
  if (!wrapper) return;

  if (getComputedStyle(wrapper).position === "static") {
    wrapper.style.position = "relative";
  }

  const btn = document.createElement("button");
  btn.className = "rc-scan-btn";
  btn.innerHTML = MAGNIFIER_SVG;
  btn.title = "Check with RealityCheck";

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const url = extractMediaUrl(mediaEl);
    if (!url) {
      showPopover(wrapper, "error", { error: "Could not extract media URL" });
      return;
    }

    // Show loading
    btn.classList.add("rc-loading");
    showPopover(wrapper, "loading");

    try {
      const response = await sendToBackground<ScanRequest, ScanResponse>({
        name: "scan",
        body: { mediaUrl: url },
      });

      btn.classList.remove("rc-loading");

      if (response.success) {
        showPopover(wrapper, "result", {
          score: response.resultScore,
          isAi: response.isAi,
        });
      } else {
        showPopover(wrapper, "error", { error: response.error });
      }
    } catch (err) {
      btn.classList.remove("rc-loading");
      showPopover(wrapper, "error", {
        error: err instanceof Error ? err.message : "Scan failed",
      });
    }
  });

  wrapper.appendChild(btn);
}

// ── DOM scanning ───────────────────────────────────────────────

function scanForMedia() {
  // Target images in tweet media containers
  const images = document.querySelectorAll<HTMLImageElement>(
    'article img[src*="twimg.com"], article img[src*="pbs.twimg"], [data-testid="tweetPhoto"] img',
  );
  images.forEach((img) => {
    // Skip tiny images (profile pics, emojis)
    if (img.naturalWidth > 0 && img.naturalWidth < 80) return;
    if (img.width < 80 && img.height < 80) return;
    // Skip profile avatars
    if (img.closest('[data-testid="UserAvatar-Container"]')) return;
    injectButton(img);
  });

  // Target videos
  const videos = document.querySelectorAll<HTMLVideoElement>("article video");
  videos.forEach((video) => injectButton(video));
}

// ── Init ───────────────────────────────────────────────────────

function init() {
  injectStyles();
  scanForMedia();

  // Watch for new tweets loaded via infinite scroll
  const observer = new MutationObserver(() => {
    scanForMedia();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

init();
