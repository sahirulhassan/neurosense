"""
EEG Diagnostic Engine Package
"""

from .analyzer import process_eeg
from .ocr import run_windows_ocr, parse_eeg_metadata
from .signal_processor import load_and_orient_eeg, digitize_eeg_traces, analyze_signals
from .clinical_rules import generate_clinical_interpretation
from .report_builder import build_eeg_pdf

__all__ = [
    "process_eeg",
    "run_windows_ocr",
    "parse_eeg_metadata",
    "load_and_orient_eeg",
    "digitize_eeg_traces",
    "analyze_signals",
    "generate_clinical_interpretation",
    "build_eeg_pdf"
]
