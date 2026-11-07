# Contributing to NeuroSense

Thank you for your interest in contributing to **NeuroSense**! We welcome contributions from clinical neurophysiologists, neurologists, biomedical engineers, and developers.

---

## 1. Development Principles

NeuroSense is built on two core principles:

1. **Clinical Authenticity & Rigor**: All signal processing algorithms and diagnostic statements must adhere to the **American Clinical Neurophysiology Society (ACNS)** guidelines and the International 10-20 system.
2. **Antislop Interface Design**: We maintain clean, purposeful medical aesthetics. We reject AI slop—no decorative emojis, no neon gradient cards, no non-functional pulsing borders. Every interaction must serve a medical or operational purpose.

---

## 2. Setting Up the Development Environment

NeuroSense uses [`uv`](https://github.com/astral-sh/uv) for fast, deterministic dependency management.

```powershell
# 1. Clone the repository
git clone https://github.com/sahirulhassan/neurosense.git
cd neurosense

# 2. Sync the virtual environment and all dependencies
uv sync

# 3. Run the automated diagnostic test
uv run python eeg_cli.py analyze src.jpg

# 4. Launch the local workstation in your dedicated terminal
uv run python app.py
```

---

## 3. Repository Architecture

- `eeg_engine/`: Core neurophysiology pipeline:
  - `signal_processor.py`: Trace digitization, Welch PSD decomposition, band ratios, and multi-channel burst detection.
  - `clinical_rules.py`: ACNS-compliant clinical reasoning engine generating formal interpretations, impressions, and diagnoses.
  - `ocr.py`: Hardware-accelerated OCR for montage calibrations and patient demographics.
  - `report_builder.py`: ReportLab canvas engine generating strict **1-page clinical PDF reports**.
- `static/`: Frontend workstation:
  - `index.html`: Clean, semantic medical workstation markup.
  - `style.css`: Clinical Paper and Telemetry Dark design systems.
  - `app.js`: Telemetry waveform sweep canvas renderer, spectral bar counters, and report editor.
- `tests/`: Automated test suites:
  - `qa_animations.py`: Playwright headless animation and telemetry sweep verification.
  - `qa_screenshots.py`: End-to-end visual QA suite.

---

## 4. Code Standards & Testing

Before submitting a pull request, verify:

1. **PDF 1-Page Constraint**: Ensure any changes to `report_builder.py` strictly preserve the **1-page constraint**. Run:
   ```powershell
   uv run python -c "import pypdf; r = pypdf.PdfReader('reports/EEG_Report_EEG20261030002.pdf'); assert len(reader.pages) == 1"
   ```
2. **Reduced Motion Accessibility**: Any added animations must respect `@media (prefers-reduced-motion: reduce)`.
3. **No Unused Dependencies**: Only add dependencies via `uv add <package>` if strictly necessary.

---

## 5. Submitting a Pull Request

1. Create a feature branch from `master`: `git checkout -b feature/your-feature-name`.
2. Commit your changes with clear, semantic commit messages (e.g., `feat(dsp): add notch filter quality factor tuning`).
3. Push to your branch and open a Pull Request using the provided PR template.

Thank you for helping advance open neurophysiology tools!
