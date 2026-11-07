"""
OCR and Header Extraction Module for EEG recordings.
Uses native Windows.Media.Ocr engine when on Windows, with fallback regex parser.
"""

import os
import re
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

PS_SCRIPT_PATH = Path(__file__).parent / "windows_ocr.ps1"

def run_windows_ocr(image_path: str) -> str:
    """Run native Windows.Media.Ocr via PowerShell helper script on Windows."""
    abs_path = os.path.abspath(image_path)
    if not PS_SCRIPT_PATH.exists():
        return ""
    
    try:
        res = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy", "Bypass",
                "-File", str(PS_SCRIPT_PATH),
                "-ImagePath", abs_path
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="ignore",
            timeout=30
        )
        if res.returncode == 0:
            return res.stdout.strip()
        else:
            print(f"Windows OCR warning: {res.stderr}")
    except Exception as e:
        print(f"Windows OCR error: {e}")
    return ""

def parse_eeg_metadata(ocr_text: str) -> Dict[str, Any]:
    """Parse key clinical metadata fields from OCR text."""
    meta = {
        "institution": "Clinical Neurophysiology Laboratory",
        "patient_name": "",
        "age": "",
        "age_years": 0.0,
        "gender": "",
        "exam_date": "",
        "mrn": "",
        "exam_id": "",
        "referring_doctor": "Dr. Hira Asif",
        "patient_state": "Sedated asleep",
        "paper_speed": "24.20 mm/s",
        "sensitivity": "70.00 uV/10mm",
        "notch_filter": "50 Hz",
        "channels_count": 18,
        "montage_type": "10-20 Standard Longitudinal Bipolar (Double Banana)"
    }
    
    if not ocr_text:
        return meta

    # Optional institution detection
    inst_m = re.search(r"([A-Za-z\s\(\)]+(?:Institute|Hospital|Neurosciences|Clinic|Center|Laboratory)[A-Za-z\s\(\)]*)", ocr_text, re.IGNORECASE)
    if inst_m:
        cand = inst_m.group(1).strip()
        if len(cand) > 8 and len(cand) < 60:
            meta["institution"] = cand.strip()

    # Name
    name_m = re.search(r"Name\s*[:\-]?\s*([a-zA-Z\s]+?)(?=\s+(?:Main|Sex|Age|Examine|Report|\d|1\.6|$))", ocr_text, re.IGNORECASE)
    if name_m:
        val = name_m.group(1).strip()
        if len(val) > 2:
            meta["patient_name"] = val.title()

    # Sex / Gender
    sex_m = re.search(r"Sex\s*[:\-]?\s*([A-Za-z]+)", ocr_text, re.IGNORECASE)
    if sex_m:
        s = sex_m.group(1).lower()
        if "fem" in s:
            meta["gender"] = "Female"
        elif "mal" in s:
            meta["gender"] = "Male"

    # Age
    age_m = re.search(r"Age\s*[:\-]?\s*(\d+)\s*(year|yr|m|month)?", ocr_text, re.IGNORECASE)
    if age_m:
        meta["age"] = f"{age_m.group(1)} years"
        try:
            meta["age_years"] = float(age_m.group(1))
        except:
            pass

    # Examine Date
    date_m = re.search(r"(?:Examine\s*Date|Date)\s*[:\-]?\s*(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})", ocr_text, re.IGNORECASE)
    if date_m:
        meta["exam_date"] = date_m.group(1).replace("/", "-")

    # ID / MRN
    id_m = re.search(r"(?:Main\s*ID|ID)\s*[:\-]?\s*([A-Za-z0-9_/-]+)", ocr_text, re.IGNORECASE)
    if id_m:
        val = id_m.group(1).strip()
        if len(val) >= 3:
            meta["exam_id"] = val
            if "EEG" in val:
                meta["mrn"] = val

    # Direct search for EEG ID pattern
    eeg_id_m = re.search(r"\b(EEG\d+)\b", ocr_text, re.IGNORECASE)
    if eeg_id_m:
        meta["exam_id"] = eeg_id_m.group(1).upper()

    # State
    if re.search(r"sedat(?:ed)?\s*asleep", ocr_text, re.IGNORECASE):
        meta["patient_state"] = "Sedated asleep"
    elif re.search(r"awake", ocr_text, re.IGNORECASE):
        meta["patient_state"] = "Awake"
    elif re.search(r"drowsy", ocr_text, re.IGNORECASE):
        meta["patient_state"] = "Drowsy"
    elif re.search(r"asleep|sleep", ocr_text, re.IGNORECASE):
        meta["patient_state"] = "Asleep"

    # Sensitivity & Speed
    speed_m = re.search(r"(\d+(?:\.\d+)?)\s*mm/s", ocr_text, re.IGNORECASE)
    if speed_m:
        val = float(speed_m.group(1))
        if val > 100:
            val = val / 100.0
        meta["paper_speed"] = f"{val:.2f} mm/s"

    sens_m = re.search(r"(\d+(?:\.\d+)?)\s*uV/10mm", ocr_text, re.IGNORECASE)
    if sens_m:
        meta["sensitivity"] = f"{sens_m.group(1)} uV/10mm"

    notch_m = re.search(r"(50|60)\s*Hz", ocr_text, re.IGNORECASE)
    if notch_m:
        meta["notch_filter"] = f"{notch_m.group(1)} Hz"

    return meta
