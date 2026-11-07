"""
Unified EEG Analyzer Pipeline
Coordinates image loading, OCR metadata extraction, signal processing,
clinical reasoning, AI multimodal augmentation, and report generation.
"""

import os
import io
import time
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
from PIL import Image

from .ocr import run_windows_ocr, parse_eeg_metadata
from .signal_processor import (
    load_and_orient_eeg,
    digitize_eeg_traces,
    analyze_signals,
    get_downsampled_waveforms,
    CHANNEL_NAMES
)
from .clinical_rules import generate_clinical_interpretation
from .report_builder import build_eeg_pdf
from .ai_reasoning import analyze_with_gemini

REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

def generate_epoch_snippet(
    oriented_img: Image.Image,
    digitized: Dict[str, Any],
    signal_results: Dict[str, Any],
    output_path: str
) -> Optional[str]:
    """
    Crops the epoch containing the detected paroxysmal burst and saves it as an image snippet.
    """
    try:
        x_start, y_top, x_end, y_bottom = digitized["trace_box"]
        duration = digitized["duration"]
        total_w = x_end - x_start

        # Default snippet window around 4s to 8s if burst detected, or center 4s
        p_start = signal_results.get("paroxysm_start_sec")
        p_end = signal_results.get("paroxysm_end_sec")

        if p_start is not None and p_end is not None:
            t1 = max(0.0, p_start - 0.8)
            t2 = min(duration, p_end + 0.8)
        else:
            t1 = 3.5
            t2 = 7.5

        crop_x1 = int(x_start + (t1 / duration) * total_w)
        crop_x2 = int(x_start + (t2 / duration) * total_w)
        crop_y1 = int(y_top)
        crop_y2 = int(y_bottom)

        snippet = oriented_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))
        snippet.save(output_path, "JPEG", quality=90)
        return output_path
    except Exception as e:
        print(f"Failed to generate epoch snippet: {e}")
        return None

def process_eeg(
    image_path: str,
    rotation_deg: Optional[int] = None,
    api_key: Optional[str] = None,
    custom_metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Full pipeline to process an EEG image:
    1. Loads and orients image
    2. Runs OCR for metadata
    3. Digitizes 19 channels and extracts signal metrics
    4. Applies ACNS clinical reasoning rules
    5. Optionally runs Gemini Vision AI if API key provided
    6. Generates high quality PDF report
    7. Prepares interactive waveforms and diagnostics
    """
    start_time = time.time()
    
    # 1. Image preparation & orientation
    oriented_img = load_and_orient_eeg(image_path, rotation_deg=rotation_deg)
    
    # Save oriented temporary file for OCR if needed
    temp_oriented_path = str(REPORTS_DIR / "temp_oriented.jpg")
    oriented_img.save(temp_oriented_path, "JPEG", quality=95)

    # 2. OCR & Metadata extraction
    raw_ocr = run_windows_ocr(image_path) or run_windows_ocr(temp_oriented_path)
    metadata = parse_eeg_metadata(raw_ocr)

    # Apply any custom user overrides
    if custom_metadata:
        metadata.update({k: v for k, v in custom_metadata.items() if v is not None})

    # 3. Signal extraction & Digitization
    digitized = digitize_eeg_traces(oriented_img)
    signal_results = analyze_signals(digitized)

    # 4. Clinical Reasoning
    clinical_report = generate_clinical_interpretation(metadata, signal_results)

    # 5. Optional Gemini Multimodal AI
    ai_interpretation = None
    if api_key:
        with io.BytesIO() as buf:
            # Resize slightly to stay within responsive size
            max_dim = 2048
            w, h = oriented_img.size
            if max(w, h) > max_dim:
                scale = max_dim / float(max(w, h))
                ai_img = oriented_img.resize((int(w * scale), int(h * scale)))
            else:
                ai_img = oriented_img
            ai_img.save(buf, format="JPEG", quality=85)
            ai_bytes = buf.getvalue()

        ai_interpretation = analyze_with_gemini(ai_bytes, api_key=api_key)

    # 6. Generate Representative Epoch Snippet
    snippet_path = str(REPORTS_DIR / f"snippet_{int(time.time())}.jpg")
    saved_snippet = generate_epoch_snippet(oriented_img, digitized, signal_results, snippet_path)

    # 7. Generate PDF Report
    pdf_filename = f"EEG_Report_{metadata.get('mrn', 'Record').replace('/', '_')}.pdf"
    pdf_path = str(REPORTS_DIR / pdf_filename)
    build_eeg_pdf(
        output_pdf_path=pdf_path,
        metadata=metadata,
        clinical_data=clinical_report,
        waveform_image_path=saved_snippet
    )

    # 8. Web Frontend Waveforms
    waveform_web_data = get_downsampled_waveforms(digitized, target_points=700)

    elapsed = round(time.time() - start_time, 2)

    return {
        "status": "success",
        "elapsed_seconds": elapsed,
        "metadata": metadata,
        "signals": signal_results,
        "clinical_report": clinical_report,
        "ai_multimodal": ai_interpretation,
        "pdf_url": f"/reports/{pdf_filename}",
        "snippet_url": f"/reports/{Path(snippet_path).name}" if saved_snippet else None,
        "waveforms": waveform_web_data,
        "channels_list": CHANNEL_NAMES
    }
