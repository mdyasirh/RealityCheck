const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface UploadResponse {
  scan_id: string;
  status: string;
  message: string;
}

export interface ScanResult {
  id: string;
  user_id: string;
  file_hash: string;
  result_score: number | null;
  is_ai: boolean | null;
  media_type: string | null;
  created_at: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Upload failed (${res.status})`);
  }

  return res.json();
}

export async function fetchScanResult(scanId: string): Promise<ScanResult> {
  const res = await fetch(`${API_BASE}/api/scans/${scanId}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Fetch failed (${res.status})`);
  }

  return res.json();
}

/**
 * Poll the backend until `result_score` is populated (i.e. processing is done).
 * Returns the completed ScanResult, or throws after `maxAttempts`.
 */
export async function pollForResult(
  scanId: string,
  intervalMs = 2000,
  maxAttempts = 60,
): Promise<ScanResult> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    try {
      const result = await fetchScanResult(scanId);
      if (result.result_score !== null) return result;
    } catch {
      // Scan row may not exist yet — keep polling
    }
  }

  throw new Error("Analysis timed out. Please try again.");
}
