"""
Optional Multimodal AI Reasoning Module.
Allows passing EEG images to Gemini Vision API for high-level neuro-interpretation
when an API key is provided, while keeping the tool 100% functional offline without one.
"""

import os
import json
import base64
import httpx
from typing import Dict, Any, Optional

SYSTEM_PROMPT = """You are an expert Clinical Neurophysiologist reviewing a routine 10-20 EEG recording.
Analyze the provided EEG image carefully:
1. Identify patient demographics and study settings (Patient Name, Age, Sex, Date, State, Sensitivity, Speed, Notch).
2. Detail the Background Activity (predominant rhythms, Delta, Theta, Alpha, Beta frequencies in Hz, symmetry, sleep features such as vertex waves or sleep spindles).
3. Identify any Epileptiform Activity (generalized or focal spike-wave complexes, polyspikes, sharp waves, location, duration).
4. Evaluate Provocative maneuvers (Photic stimulation, Hyperventilation) and Artifacts (50Hz line noise, muscle, movement, electrode pop).
5. State the Clinical Impression (Normal vs Abnormal, specific reasons).
6. Provide Diagnostic Conclusion, clinical differential, and recommended management.

Respond strictly in valid JSON format matching this schema:
{
  "patient_name": "...",
  "age": "...",
  "gender": "...",
  "patient_state": "...",
  "background_activity": "...",
  "epileptiform_findings": "...",
  "provocation_and_artifacts": "...",
  "impression": "...",
  "conclusion": "...",
  "primary_diagnosis": "...",
  "differential_diagnoses": ["...", "..."],
  "recommendations": ["...", "..."]
}
"""

def analyze_with_gemini(
    image_bytes: bytes,
    api_key: Optional[str] = None,
    mime_type: str = "image/jpeg"
) -> Optional[Dict[str, Any]]:
    """
    Calls Google Gemini multimodal API with the EEG image.
    Returns parsed clinical JSON or None if no API key is provided or request fails.
    """
    key = api_key or os.environ.get("GEMINI_API_KEY", "")
    if not key:
        return None

    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": SYSTEM_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_image
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "response_mime_type": "application/json",
            "temperature": 0.2
        }
    }

    try:
        with httpx.Client(timeout=35.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                return json.loads(text)
            else:
                print(f"Gemini API error: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"Gemini call exception: {e}")

    return None
