# Security Policy & Clinical Data Privacy

## 1. Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2.0 | :x:                |

---

## 2. Clinical Data Privacy & PHI (Protected Health Information)

NeuroSense is designed for clinical exploration, educational review, and signal processing research.

- **Offline Processing**: By default, the core signal processing engine (`signal_processor.py`), OCR engine, and ReportLab PDF generator operate **100% offline** on your local machine. No patient waveforms or medical data leave your host environment.
- **De-Identification**: Always verify that recordings ingested for research or demonstrations are properly de-identified in compliance with **HIPAA Safe Harbor** guidelines (removal of patient full names, institutional record IDs, and specific dates of birth).
- **Optional Multimodal API**: If an optional external API key (such as Google Gemini API) is supplied in settings, only anonymized image crops are transmitted over TLS for comparative opinion generation. This integration is entirely optional and disabled by default.

---

## 3. Reporting a Vulnerability

If you discover a security vulnerability or sensitive data leak in NeuroSense, please do not open a public issue.

Instead, please send an advisory directly to:
**`sahirulhasan2002@gmail.com`**

Include:
- Type of vulnerability (e.g., file traversal, remote code execution, PHI leakage)
- Detailed steps to reproduce
- Proposed mitigation if known

We will acknowledge receipt within 48 hours and work toward a coordinated resolution.
