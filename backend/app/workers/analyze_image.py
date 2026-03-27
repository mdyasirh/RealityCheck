"""
Image analysis pipeline – ViT-based AI-generated image detection.

Uses the `umm-maybe/AI-image-detector` model (a ViT fine-tuned on real
vs. AI-generated images) to produce a confidence score.
"""

import logging

import torch
from PIL import Image

from app.workers.models import get_image_pipeline

logger = logging.getLogger(__name__)


def analyze_image(filepath: str) -> dict:
    """
    Run deepfake / AI-generation detection on an image file.

    Returns:
        {
            "is_ai": bool,
            "confidence_score": float,   # 0.0 – 1.0
            "media_type": "image",
        }
    """
    processor, model, device = get_image_pipeline()

    image = Image.open(filepath).convert("RGB")

    inputs = processor(images=image, return_tensors="pt").to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=-1)

    # The model's label mapping: 0 → "artificial" / "ai", 1 → "human" / "real"
    # (exact labels depend on the checkpoint; we inspect id2label to be safe)
    id2label: dict = model.config.id2label
    labels_lower = {k: v.lower() for k, v in id2label.items()}

    # Find the index whose label signals "artificial" / "ai" / "fake"
    ai_index: int | None = None
    for idx, label in labels_lower.items():
        if any(kw in label for kw in ("artificial", "ai", "fake", "generated")):
            ai_index = idx
            break

    if ai_index is None:
        # Fallback: treat index 0 as the AI class
        ai_index = 0
        logger.warning(
            "Could not auto-detect AI label from id2label=%s; defaulting to index 0",
            id2label,
        )

    ai_prob = probabilities[0][ai_index].item()

    result = {
        "is_ai": ai_prob >= 0.5,
        "confidence_score": round(ai_prob, 4),
        "media_type": "image",
    }

    logger.info("Image analysis for %s: %s", filepath, result)
    return result
