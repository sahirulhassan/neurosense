"""
Command Line Interface (CLI) for EEG Analyzer & Diagnostic Tool.
Usage:
    python eeg_cli.py analyze src.jpg
    python eeg_cli.py analyze src.jpg --output my_report.pdf --json results.json
    python eeg_cli.py serve --port 8000
"""

import sys
import json
import argparse
from pathlib import Path
from eeg_engine.analyzer import process_eeg

# ANSI color codes for terminal formatting
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

def print_header(title: str):
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN} {title}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}")

def run_analysis_cli(args):
    image_path = args.image
    if not Path(image_path).exists():
        print(f"{RED}Error: File '{image_path}' not found.{RESET}")
        sys.exit(1)

    print(f"{YELLOW}Processing EEG recording: {image_path}...{RESET}")
    result = process_eeg(image_path, rotation_deg=args.rotate)

    meta = result["metadata"]
    signals = result["signals"]
    bands = signals["bands"]
    clinical = result["clinical_report"]

    print_header("ELECTROENCEPHALOGRAPHY (EEG) CLINICAL REPORT")
    print(f"Patient Name:    {BOLD}{meta.get('patient_name')}{RESET}")
    print(f"Age / Gender:    {meta.get('age')} | {meta.get('gender')}")
    print(f"Exam Date:       {meta.get('exam_date')}")
    print(f"MRN / Exam ID:   {meta.get('mrn')} ({meta.get('exam_id')})")
    print(f"Patient State:   {BOLD}{meta.get('patient_state')}{RESET}")
    print(f"Montage / Tech:  {meta.get('montage_type')} ({meta.get('channels_count')} ch)")
    print(f"Calibration:     {meta.get('sensitivity')} | Speed: {meta.get('paper_speed')} | Notch: {meta.get('notch_filter')}")

    print_header("SPECTRAL & BACKGROUND RHYTHMS")
    print(f"Delta (0.5-4Hz): {bands.get('delta_pct')}% (Peak: {bands.get('delta_peak_hz')} Hz)")
    print(f"Theta (4-8Hz):   {bands.get('theta_pct')}% (Peak: {bands.get('theta_peak_hz')} Hz)")
    print(f"Alpha (8-13Hz):  {bands.get('alpha_pct')}%")
    print(f"Beta (13-30Hz):  {bands.get('beta_pct')}% (Peak: {bands.get('beta_peak_hz')} Hz)")
    sleep = signals.get("sleep_markers", {})
    print(f"Sleep Markers:   Vertex Waves: {'Yes' if sleep.get('vertex_waves') else 'No'} | "
          f"Sleep Spindles: {'Yes' if sleep.get('sleep_spindles') else 'No'} | "
          f"Sedation Beta: {'Yes' if sleep.get('diffuse_beta') else 'No'}")

    print_header("PAROXYSMAL / EPILEPTIFORM ACTIVITY")
    if signals.get("paroxysm_detected"):
        status_color = RED
        status_text = "EPILEPTIFORM DISCHARGE DETECTED"
    else:
        status_color = GREEN
        status_text = "NO EPILEPTIFORM DISCHARGE DETECTED"

    print(f"Status:          {BOLD}{status_color}{status_text}{RESET}")
    if signals.get("paroxysm_detected"):
        print(f"Onset / Offset:  t = {signals.get('paroxysm_start_sec')} s to {signals.get('paroxysm_end_sec')} s (Duration: {signals.get('paroxysm_duration_sec')} s)")
        print(f"Distribution:    {'GENERALIZED (Bilateral Synchronous)' if signals.get('is_generalized') else 'FOCAL'}")
        print(f"Involvement:     {signals.get('involvement_pct')}% of channels")
        print(f"Morphology:      High-amplitude spike and slow wave complexes")

    print_header("FORMAL INTERPRETATION")
    for para in clinical.get("interpretation_paragraphs", []):
        print(f"• {para}")

    print_header("IMPRESSION")
    print(f"{BOLD}{clinical.get('impression')}{RESET}")

    print_header("CONCLUSION & DIAGNOSIS")
    print(f"{BOLD}{clinical.get('conclusion')}{RESET}")
    print(f"\n{BOLD}Primary Diagnosis:{RESET} {clinical.get('primary_diagnosis')}")
    print(f"{BOLD}Differential Diagnoses:{RESET}")
    for diff in clinical.get("differential_diagnoses", []):
        print(f"  - {diff}")
    print(f"{BOLD}Recommended Next Steps:{RESET}")
    for act in clinical.get("recommended_actions", []):
        print(f"  → {act}")

    # Output files
    pdf_path = result.get("pdf_url", "").replace("/reports/", "reports/")
    if args.output:
        import shutil
        shutil.copy(pdf_path, args.output)
        pdf_path = args.output

    print_header("EXPORTS")
    print(f"{GREEN}✓ PDF Clinical Report saved to: {pdf_path}{RESET}")

    if args.json:
        # Strip large raw waveform array for compact JSON save
        save_data = {k: v for k, v in result.items() if k != "waveforms"}
        with open(args.json, "w") as f:
            json.dump(save_data, f, indent=2)
        print(f"{GREEN}✓ Structured Analysis JSON saved to: {args.json}{RESET}")

    print(f"\nProcessing completed in {result['elapsed_seconds']} seconds.\n")

def run_serve_cli(args):
    import uvicorn
    print(f"\n{BOLD}{GREEN}Starting EEG Diagnostic Studio Web App on http://localhost:{args.port}{RESET}\n")
    uvicorn.run("app:app", host="0.0.0.0", port=args.port, reload=True)

def main():
    parser = argparse.ArgumentParser(description="NeuroSense EEG Analyzer & Clinical Report Tool")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Analyze command
    analyze_parser = subparsers.add_parser("analyze", help="Analyze an EEG recording image")
    analyze_parser.add_argument("image", help="Path to EEG scan image (e.g. src.jpg)")
    analyze_parser.add_argument("--rotate", type=int, choices=[0, 90, 180, 270], default=None, help="Manual rotation angle")
    analyze_parser.add_argument("--output", "-o", help="Custom output path for generated PDF")
    analyze_parser.add_argument("--json", "-j", help="Output path for structured JSON results")

    # Serve command
    serve_parser = subparsers.add_parser("serve", help="Launch interactive Web Dashboard")
    serve_parser.add_argument("--port", "-p", type=int, default=8000, help="Port to listen on (default: 8000)")

    args = parser.parse_args()
    if args.command == "analyze":
        run_analysis_cli(args)
    elif args.command == "serve":
        run_serve_cli(args)
    else:
        # Default action: analyze src.jpg if available, else show help
        if Path("src.jpg").exists():
            class DefaultArgs:
                image = "src.jpg"
                rotate = None
                output = None
                json = None
            run_analysis_cli(DefaultArgs())
        else:
            parser.print_help()

if __name__ == "__main__":
    main()
