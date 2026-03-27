"""
Model registry – lazy-loads and caches ML models per media type.

Each model is loaded once on first use and kept in memory for the
lifetime of the Celery worker process. This avoids repeated disk I/O
and GPU warm-up on every task.
"""

import logging
from threading import Lock

import torch
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
)

logger = logging.getLogger(__name__)

# ── Model identifiers ───────────────────────────────────────────
# Image: ViT fine-tuned for AI-generated image detection
IMAGE_MODEL_ID = "umm-maybe/AI-image-detector"

# Audio: Wav2Vec2 fine-tuned for synthetic speech detection
AUDIO_MODEL_ID = "facebook/wav2vec2-base"

# ── Singleton caches ────────────────────────────────────────────
_image_model = None
_image_processor = None
_audio_model = None
_audio_extractor = None
_lock = Lock()


def _get_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


def get_image_pipeline() -> tuple:
    """Return (processor, model, device) for image classification."""
    global _image_processor, _image_model
    with _lock:
        if _image_model is None:
            logger.info("Loading image model: %s", IMAGE_MODEL_ID)
            device = _get_device()
            _image_processor = AutoImageProcessor.from_pretrained(IMAGE_MODEL_ID)
            _image_model = AutoModelForImageClassification.from_pretrained(
                IMAGE_MODEL_ID,
            ).to(device).eval()
            logger.info("Image model loaded on %s", device)
    return _image_processor, _image_model, _get_device()


def get_audio_pipeline() -> tuple:
    """Return (feature_extractor, model, device) for audio classification."""
    global _audio_extractor, _audio_model
    with _lock:
        if _audio_model is None:
            logger.info("Loading audio model: %s", AUDIO_MODEL_ID)
            device = _get_device()
            _audio_extractor = AutoFeatureExtractor.from_pretrained(AUDIO_MODEL_ID)
            _audio_model = AutoModelForAudioClassification.from_pretrained(
                AUDIO_MODEL_ID,
                num_labels=2,
                problem_type="single_label_classification",
            ).to(device).eval()
            logger.info("Audio model loaded on %s", device)
    return _audio_extractor, _audio_model, _get_device()
