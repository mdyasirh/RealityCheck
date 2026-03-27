import type { PlasmoMessaging } from "@plasmohq/messaging";
import { API_BASE, POLL_INTERVAL_MS, POLL_MAX_ATTEMPTS } from "~/config";

export interface ScanRequest {
  mediaUrl: string;
}

export interface ScanResponse {
  success: boolean;
  scanId?: string;
  resultScore?: number;
  isAi?: boolean;
  mediaType?: string;
  error?: string;
}

async function submitUrl(url: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/scan-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Upload failed (${res.status})`);
  }

  const data = await res.json();
  return data.scan_id;
}

async function pollResult(scanId: string): Promise<{
  result_score: number;
  is_ai: boolean;
  media_type: string;
}> {
  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${API_BASE}/api/scans/${scanId}`);
    if (!res.ok) continue;

    const data = await res.json();
    if (data.result_score !== null && data.result_score !== undefined) {
      return {
        result_score: data.result_score,
        is_ai: data.is_ai ?? false,
        media_type: data.media_type ?? "image",
      };
    }
  }
  throw new Error("Analysis timed out");
}

const handler: PlasmoMessaging.MessageHandler<ScanRequest, ScanResponse> =
  async (req, res) => {
    try {
      const scanId = await submitUrl(req.body!.mediaUrl);
      const result = await pollResult(scanId);
      res.send({
        success: true,
        scanId,
        resultScore: result.result_score,
        isAi: result.is_ai,
        mediaType: result.media_type,
      });
    } catch (err) {
      res.send({
        success: false,
        error: err instanceof Error ? err.message : "Scan failed",
      });
    }
  };

export default handler;
