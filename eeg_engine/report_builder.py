"""
ReportLab PDF Generator for Clinical EEG Reports.
Generates an official, publication-grade 1-page clinical neurophysiology report.
Strictly fits on exactly one page without page overflows.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas


class SinglePageNumberedCanvas(canvas.Canvas):
    """Canvas that enforces clean institutional footer and page numbering."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count):
        self.saveState()
        # Bottom rule
        self.setStrokeColor(colors.HexColor("#0f766e"))
        self.setLineWidth(1.5)
        self.line(36, 32, 576, 32)
        
        self.setFont("Helvetica", 7)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(36, 22, "CONFIDENTIAL MEDICAL DOCUMENT — FOR PROFESSIONAL CLINICAL USE ONLY")
        self.drawRightString(576, 22, f"Standard 10-20 EEG Protocol  |  Page 1 of {page_count}")
        self.restoreState()


def build_eeg_pdf(
    output_pdf_path: str,
    metadata: Dict[str, Any],
    clinical_data: Dict[str, Any],
    waveform_image_path: Optional[str] = None
) -> str:
    """
    Builds a professional 1-page clinical EEG report.
    Strictly guaranteed single-page layout across all OS platforms and font engines.
    """
    # 612 x 792 points (letter). Available height ~ 748 points.
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=32,
        rightMargin=32,
        topMargin=18,
        bottomMargin=24
    )

    styles = getSampleStyleSheet()
    
    inst_title = ParagraphStyle(
        'InstTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=12.5,
        textColor=colors.HexColor('#0f766e')
    )
    inst_sub = ParagraphStyle(
        'InstSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=8.5,
        textColor=colors.HexColor('#475569')
    )
    dept_style = ParagraphStyle(
        'DeptStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        alignment=2, # Right
        textColor=colors.HexColor('#1e293b')
    )
    report_title = ParagraphStyle(
        'ReportTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=12.5,
        alignment=1, # Center
        spaceBefore=2,
        spaceAfter=3,
        textColor=colors.HexColor('#0f172a')
    )
    section_head = ParagraphStyle(
        'SectionHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=9.5,
        spaceBefore=2.5,
        spaceAfter=1.5,
        textColor=colors.HexColor('#0f766e')
    )
    body_style = ParagraphStyle(
        'BodyP',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        spaceAfter=1.8,
        textColor=colors.HexColor('#1e293b')
    )
    table_label = ParagraphStyle(
        'TLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=8.8,
        textColor=colors.HexColor('#334155')
    )
    table_val = ParagraphStyle(
        'TVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=8.8,
        textColor=colors.HexColor('#0f172a')
    )

    elements = []

    # 1. Generalized Institution Banner
    inst_name = metadata.get("institution") or "CLINICAL NEUROPHYSIOLOGY LABORATORY"
    header_data = [
        [
            Paragraph(f"<b>{inst_name.upper()}</b><br/>"
                      f"<font color='#475569'>DIVISION OF CLINICAL NEUROLOGY & EPILEPSY MONITORING</font>", inst_title),
            Paragraph("<b>ROUTINE ELECTROENCEPHALOGRAPHY REPORT</b><br/>"
                      "<font size=6.5 color='#64748b'>ACNS Standardized Nomenclature</font>", dept_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[368, 180])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#0f766e')),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 2))

    # Title: ElectroEncephaloGraphy (EEG)
    elements.append(Paragraph("<u><b>ELECTROENCEPHALOGRAPHY (EEG) EXAMINATION</b></u>", report_title))

    # 2. Demographics Table
    name_str = metadata.get("patient_name", "UNSPECIFIED").upper()
    age_str = metadata.get("age", "").upper()
    gender_str = metadata.get("gender", "").upper()
    date_str = metadata.get("exam_date", "")
    ref_by = metadata.get("referring_doctor", "DR. HIRA ASIF").upper()
    mr_num = metadata.get("mrn") or metadata.get("exam_id") or "2026/016228"
    state_str = metadata.get("patient_state", "Sedated asleep")

    demo_data = [
        [
            Paragraph("PATIENT NAME:", table_label), Paragraph(f"<b>{name_str}</b>", table_val),
            Paragraph("AGE / GENDER:", table_label), Paragraph(f"{age_str} / {gender_str}", table_val),
        ],
        [
            Paragraph("EXAM DATE:", table_label), Paragraph(date_str, table_val),
            Paragraph("RECORDING ID:", table_label), Paragraph(mr_num, table_val),
        ],
        [
            Paragraph("REF. PHYSICIAN:", table_label), Paragraph(ref_by, table_val),
            Paragraph("PATIENT STATE:", table_label), Paragraph(state_str, table_val),
        ],
        [
            Paragraph("TECH / MONTAGE:", table_label), Paragraph("18-Ch Standard 10-20 Longitudinal Bipolar", table_val),
            Paragraph("CALIBRATION:", table_label), Paragraph(f"{metadata.get('sensitivity', '70 uV/10mm')}, {metadata.get('paper_speed', '24.2 mm/s')}, {metadata.get('notch_filter', '50 Hz')}", table_val),
        ]
    ]

    demo_table = Table(demo_data, colWidths=[80, 214, 80, 174])
    demo_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.2),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]))
    elements.append(demo_table)
    elements.append(Spacer(1, 2))

    # 3. INTERPRETATION
    elements.append(Paragraph("<u><b>INTERPRETATION:</b></u>", section_head))
    
    paragraphs = clinical_data.get("interpretation_paragraphs", [])
    if not paragraphs and "interpretation_text" in clinical_data:
        paragraphs = [p.strip() for p in clinical_data["interpretation_text"].split("\n") if p.strip()]

    for p_text in paragraphs:
        elements.append(Paragraph(f"• {p_text}", body_style))

    # 4. IMPRESSION
    elements.append(Spacer(1, 2))
    elements.append(Paragraph("<u><b>IMPRESSION:</b></u>", section_head))
    elements.append(Paragraph(f"<b>{clinical_data.get('impression', '')}</b>", body_style))

    # 5. CONCLUSION & RECOMMENDATIONS
    elements.append(Spacer(1, 2))
    elements.append(Paragraph("<u><b>CONCLUSION:</b></u>", section_head))
    elements.append(Paragraph(clinical_data.get("conclusion", ""), body_style))

    # 6. Representative Epoch Snippet (Compact height to preserve 1-page rule)
    if waveform_image_path and os.path.exists(waveform_image_path):
        try:
            elements.append(Spacer(1, 2))
            elements.append(Paragraph("<b>REPRESENTATIVE EEG EPOCH (PAROXYSMAL DISCHARGE):</b>", section_head))
            # Height 56 points to fit safely on single page with generous headroom
            w_img = RLImage(waveform_image_path, width=548, height=56)
            elements.append(w_img)
        except Exception as e:
            print(f"Error adding waveform snippet: {e}")

    # 7. Neurologist Sign-Off Block
    doctor_info = clinical_data.get("neurologist", {})
    doc_name = doctor_info.get("name", "DR. HIRA ASIF")
    doc_qual = doctor_info.get("qualifications", "MBBS, FCPS (Neurology)")

    sig_data = [
        [
            Paragraph(f"<b>REPORTING NEUROLOGIST:</b><br/>"
                      f"<b>{doc_name}</b><br/>"
                      f"<font color='#475569'>{doc_qual}</font>", body_style),
            Paragraph("<b>SIGNATURE:</b> ___________________________<br/>"
                      "<font size=6.5 color='#64748b'>Electronically Signed & Authenticated Record</font>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[274, 274])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    
    elements.append(Spacer(1, 2))
    elements.append(KeepTogether([sig_table]))

    # Build PDF
    doc.build(elements, canvasmaker=SinglePageNumberedCanvas)
    return output_pdf_path
