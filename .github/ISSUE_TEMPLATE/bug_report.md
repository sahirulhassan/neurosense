---
name: Clinical / DSP Bug Report
about: Report an incorrect waveform digitization, spectral calculation error, or clinical rule mismatch
title: "[BUG]: "
labels: ["bug", "triage"]
assignees: ""
---

### Diagnostic Pipeline Issue Description
A clear and concise description of the issue encountered during EEG analysis or workstation rendering.

### Recording / Montage Details
- **Montage Type**: (e.g., 18-channel double-banana, 10-20 system)
- **Sampling Rate / Paper Speed**: (e.g., 24.20 mm/s, 70 uV/10mm)
- **Patient State**: (e.g., Awake, Sedated asleep)

### Steps to Reproduce
1. Ingest EEG recording file: `...`
2. Run command or UI action: `uv run python eeg_cli.py analyze ...`
3. Observe finding / error: `...`

### Expected Clinical Behavior
What should the ACNS clinical rule engine or DSP pipeline have reported instead?

### Environment
- **OS**: [e.g., Windows 11, Ubuntu 22.04, macOS]
- **Python Version**: [e.g., 3.11, 3.12 via `uv`]
- **Browser (if UI)**: [e.g., Chrome, Edge]

### Additional Context
Add any other context, snippet images, or console traces here.
