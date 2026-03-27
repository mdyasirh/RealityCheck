"""
Audio analysis pipeline – Wav2Vec2-based synthetic speech detection.

Uses a Wav2Vec2 backbone with a classification head to distinguish
real human speech from AI-synthesised audio.  The model is loaded via
the shared model registry in `models.py`.
"""

import logging

import torch
import torchaudio

from app.workers.models import get_audio_pipeline

logger = logging.getLogger(__name__)

TARGET_SAMPLE_RATE = 16_000  # Wav2Vec2 expects 16 kHz mono
MAX_AUDIO_SECONDS = 30       # Truncate long files to bound inference time


def analyze_audio(filepath: str) -> dict:
    """
    Run synthetic-speech detection on a WAV file.

    Returns:
        {
            "is_ai": bool,
            "confidence_score": float,   # 0.0 – 1.0
            "media_type": "audio",
        }
    """
    extractor, model, device = get_audio_pipeline()

    # ── Load & resample ──────────────────────────────────────────
    waveform, sample_rate = torchaudio.load(filepath)

    # Convert to mono if stereo
    if waveform.shape[0] > 1:
        waveform = waveform.mean(dim=0, keepdim=True)

    # Resample to 16 kHz
    if sample_rate != TARGET_SAMPLE_RATE:
        resampler = torchaudio.transforms.Resample(
            orig_freq=sample_rate, new_freq=TARGET_SAMPLE_RATE,
        )
        waveform = resampler(waveform)

    # Truncate to MAX_AUDIO_SECONDS
    max_samples = TARGET_SAMPLE_RATE * MAX_AUDIO_SECONDS
    if waveform.shape[1] > max_samples:
        waveform = waveform[:, :max_samples]

    # Squeeze to 1-D array for the feature extractor
    audio_array = waveform.squeeze(0).numpy()

    # ── Feature extraction & inference ───────────────────────────
    inputs = extractor(
        audio_array,
        sampling_rate=TARGET_SAMPLE_RATE,
        return_tensors="pt",
        padding=True,
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)

    # Convention: label 0 = real, label 1 = synthetic / AI
    # The model was initialised with num_labels=2 in models.py.
    ai_index = 1
    ai_prob = probabilities[0][ai_index].item()

    result = {
        "is_ai": ai_prob >= 0.5,
        "confidence_score": round(ai_prob, 4),
        "media_type": "audio",
    }

    logger.info("Audio analysis for %s: %s", filepath, result)
    return result
