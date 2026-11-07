"""
FastAPI Server for EEG Findings, Interpretations & Diagnostic Report Tool.
"""

import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from eeg_engine.analyzer import process_eeg, REPORTS_DIR
from eeg_engine.report_builder import build_eeg_pdf

app = FastAPI(
    title="EEG Diagnostic Studio",
    description="Automated Clinical EEG Interpretation, Findings & Diagnosis Tool",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

class UpdateReportRequest(BaseModel):
    metadata: Dict[str, Any]
    clinical_report: Dict[str, Any]
    snippet_filename: Optional[str] = None

@app.get("/api/health")
def health():
    return {"status": "ok", "engine": "NeuroSense EEG Analyzer"}

@app.get("/api/sample")
def get_sample_info():
    """Returns metadata about the bundled sample EEG and sample report."""
    sample_src = Path("src.jpg")
    sample_rep = Path("report.jpg")
    return {
        "has_sample_eeg": sample_src.exists(),
        "has_sample_report": sample_rep.exists(),
        "sample_eeg_url": "/sample/src.jpg" if sample_src.exists() else None,
        "sample_report_url": "/sample/report.jpg" if sample_rep.exists() else None,
    }

@app.get("/sample/src.jpg")
def serve_sample_src():
    p = Path("src.jpg")
    if p.exists():
        return FileResponse(str(p), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="src.jpg not found")

@app.get("/sample/report.jpg")
def serve_sample_rep():
    p = Path("report.jpg")
    if p.exists():
        return FileResponse(str(p), media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="report.jpg not found")

@app.post("/api/analyze")
async def analyze_eeg_endpoint(
    file: Optional[UploadFile] = File(None),
    use_sample: bool = Form(False),
    rotation: Optional[int] = Form(None),
    gemini_api_key: Optional[str] = Form(None)
):
    """
    Main endpoint: processes an uploaded EEG image or the bundled sample src.jpg.
    Returns quantitative features, waveforms, interpretations, and PDF download link.
    """
    if use_sample:
        target_path = "src.jpg"
        if not os.path.exists(target_path):
            raise HTTPException(status_code=404, detail="Sample EEG (src.jpg) not found in directory.")
    elif file is not None:
        file_ext = Path(file.filename).suffix or ".jpg"
        dest_filename = f"upload_{int(Path().stat().st_mtime)}_{file.filename}"
        target_path = str(UPLOAD_DIR / dest_filename)
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    else:
        # Default to sample if exists
        if os.path.exists("src.jpg"):
            target_path = "src.jpg"
        else:
            raise HTTPException(status_code=400, detail="No EEG file uploaded and no sample src.jpg found.")

    try:
        results = process_eeg(
            image_path=target_path,
            rotation_deg=rotation,
            api_key=gemini_api_key if gemini_api_key and len(gemini_api_key.strip()) > 5 else None
        )
        return JSONResponse(content=results)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/api/regenerate_pdf")
def regenerate_pdf_endpoint(req: UpdateReportRequest):
    """Regenerates the PDF after the user edits demographics or findings in the UI."""
    try:
        mrn = req.metadata.get("mrn", "Record").replace("/", "_")
        pdf_filename = f"EEG_Report_{mrn}_custom.pdf"
        pdf_path = str(REPORTS_DIR / pdf_filename)
        
        snippet_path = None
        if req.snippet_filename:
            candidate = REPORTS_DIR / req.snippet_filename
            if candidate.exists():
                snippet_path = str(candidate)

        build_eeg_pdf(
            output_pdf_path=pdf_path,
            metadata=req.metadata,
            clinical_data=req.clinical_report,
            waveform_image_path=snippet_path
        )

        return {"status": "success", "pdf_url": f"/reports/{pdf_filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

# Mount reports directory for PDF downloads and snippet viewing
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

# Mount static frontend directory
STATIC_DIR = Path("static")
STATIC_DIR.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
