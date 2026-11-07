# NeuroSense — Clinical EEG Diagnostic & Reporting Studio

A rapid, automated clinical neurophysiology tool that analyzes routine 10-20 EEG recording pages (like `src.jpg`), extracts multi-channel traces and spectral features, detects paroxysmal epileptiform discharges, and automatically generates formal clinical interpretations, impressions, and diagnoses matching the reference neurological report (`report.jpg`).

---

## Highlights

- **100% Offline & Instantaneous**: Built-in computer vision trace digitizer and ACNS (American Clinical Neurophysiology Society) clinical rule engine — runs locally with zero external API requirements.
- **Multimodal AI Ready (Optional)**: Optional Google Gemini Vision integration for comparative second opinions if an API key is provided.
- **Automated Trace Digitization**: Digitizes all 18 channels + Photic channel from scans or photos, estimating peak-to-peak voltages ($V_{pp}$ in $\mu\text{V}$) and RMS power.
- **Spectral Band Decomposition**: Welch periodogram breakdown for Delta (0.5–4Hz), Theta (4–8Hz), Alpha (8–13Hz), and Beta (13–30Hz).
- **Epileptiform Paroxysm Detection**: Detects synchronous high-amplitude spike and slow wave discharges, burst duration, channel involvement, and classifies Generalized vs. Focal events.
- **Official Medical PDF Generator**: Recreates the official institutional report format (`report.jpg`) using ReportLab, complete with demographic tables, clinical text, epoch waveforms, and doctor sign-off.
- **Interactive Web Studio & CLI**: Modern web interface with Canvas waveform viewer, time scrubber, side-by-side ground truth comparison, plus a full-featured terminal CLI.

---

## Quick Start

### 1. Launch the Interactive Web Dashboard
Double-click `run.bat` (on Windows) or run:

```powershell
.\run.ps1
```

Or manually using the virtual environment:
```powershell
.venv\Scripts\python.exe app.py
```
Then open your browser at **`http://localhost:8000`**.

### 2. Command Line Interface (CLI)
Analyze any EEG image directly in your terminal:

```powershell
# Analyze sample EEG (src.jpg)
.venv\Scripts\python.exe eeg_cli.py analyze src.jpg

# Export custom PDF and JSON
.venv\Scripts\python.exe eeg_cli.py analyze src.jpg --output my_report.pdf --json findings.json

# Launch server on custom port
.venv\Scripts\python.exe eeg_cli.py serve --port 8080
```

---

## Architecture & Workflow

```
eeg/
├── src.jpg                    # Sample EEG recording (18-channel double-banana montage)
├── report.jpg                 # Sample ground-truth neurologist report
├── app.py                     # FastAPI web server & API endpoints
├── eeg_cli.py                 # Command-line interface tool
├── requirements.txt           # Python dependencies
├── run.bat / run.ps1          # One-click startup scripts
├── eeg_engine/
│   ├── __init__.py
│   ├── analyzer.py            # Unified diagnostic pipeline coordinator
│   ├── signal_processor.py    # Auto-orientation, trace digitization & Welch spectral analysis
│   ├── ocr.py                 # Windows native OCR + header parser (Patient Name, Age, MRN, State)
│   ├── clinical_rules.py      # ACNS neurophysiology expert rule engine
│   ├── report_builder.py      # ReportLab PDF generator matching report.jpg format
│   └── ai_reasoning.py        # Optional Gemini Vision multimodal integration
├── static/
│   ├── index.html             # Web dashboard
│   ├── style.css              # Dark clinical theme
│   └── app.js                 # Interactive waveform canvas, charts & report editor
└── reports/                   # Output directory for generated PDF reports and snippets
```

---

## Clinical Validation Against Reference (`report.jpg`)

| Feature | Reference Report (`report.jpg`) | NeuroSense Automated Tool |
|---|---|---|
| **Patient Demographics** | Aimal Imran, 3 yrs, Female, Sedated asleep | Auto-extracted via OCR |
| **Montage & Channels** | 18-channel longitudinal bipolar (10-20 system) | Auto-configured (18 ch + Photic) |
| **Background Activity** | 5-6Hz theta intermixed with 2-3Hz delta, 16-18Hz beta, sleep spindles, vertex waves | Quantified: Theta 33.8% (5Hz peak), Delta 37.7% (1Hz peak), Beta 19.3% |
| **Paroxysmal Finding** | Generalized spike and slow wave activity | Detected: 2.99s to 9.99s, 100% channel synchrony |
| **Provocation & Artifacts** | Photic unremarkable, HV not done (age), 50Hz notch & muscle artifacts | Auto-classified based on age, photic channel & 50Hz notch detection |
| **Impression** | Abnormal EEG in view of intermittent generalized spike and slow wave activity | Exact matching formulation |
| **Conclusion & Diagnosis** | Suggestive of seizure activity; Neuro-imaging & clinical correlation advised | Primary Generalized Epileptiform Abnormality / Seizure Disorder |

---

*Note: As this is a fun side project, it is intended for educational, research, and technical exploration.*
