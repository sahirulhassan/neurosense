"""
ReportLab PDF Generator for Clinical EEG Reports.
Faithfully recreates the professional neurological diagnostic report format.
"""

import os
from pathlib import Path
from typing import Dict, Any, Optional

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for footer and page numbering."""
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
        # Bottom red rule
        self.setStrokeColor(colors.HexColor("#A8322D"))
        self.setLineWidth(2)
        self.line(36, 42, 576, 42)
        
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#444444"))
        footer_text = "153-H, Block II, P.E.C.H.S, Karachi | Ph: 021-34551105, 34551106 | Mobile No. 0336-3301923 | info@rabiamoontrust.org"
        self.drawCentredString(306, 30, footer_text)
        self.drawCentredString(306, 20, "www.rabiamoontrust.org")
        self.restoreState()


def build_eeg_pdf(
    output_pdf_path: str,
    metadata: Dict[str, Any],
    clinical_data: Dict[str, Any],
    waveform_image_path: Optional[str] = None
) -> str:
    """
    Builds a professional PDF report matching the official EEG layout.
    """
    doc = SimpleDocTemplate(
        output_pdf_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom styles
    inst_style = ParagraphStyle(
        'InstTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=15,
        textColor=colors.HexColor('#A8322D')
    )
    inst_sub = ParagraphStyle(
        'InstSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#333333')
    )
    report_title = ParagraphStyle(
        'ReportTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=16,
        alignment=1, # Center
        spaceAfter=14,
        textColor=colors.HexColor('#111111')
    )
    section_head = ParagraphStyle(
        'SectionHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        spaceBefore=10,
        spaceAfter=4,
        textColor=colors.HexColor('#111111')
    )
    body_style = ParagraphStyle(
        'BodyP',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        spaceAfter=5,
        textColor=colors.HexColor('#222222')
    )
    table_label = ParagraphStyle(
        'TLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#111111')
    )
    table_val = ParagraphStyle(
        'TVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#222222')
    )

    elements = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>رابعہ مون میموریل انسٹیٹیوٹ آف نیوروسائنسز (ٹرسٹ)</b><br/>"
                      "<b>RABIA MOON MEMORIAL INSTITUTE OF<br/>NEUROSCIENCES</b><br/>(TRUST)", inst_style),
            Paragraph("<b>DEPARTMENT OF CLINICAL NEUROPHYSIOLOGY</b><br/>"
                      "<font size=8 color='#555'>DIAGNOSTIC & TELEMETRY UNIT</font>", inst_sub)
        ]
    ]
    header_table = Table(header_data, colWidths=[330, 210])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))

    # Title: ElectroEncephaloGraphy (EEG)
    elements.append(Paragraph("<u><b>ElectroEncephaloGraphy (EEG)</b></u>", report_title))

    # 2. Demographics Table
    name_str = metadata.get("patient_name", "AIMAL IMRAN").upper()
    age_str = metadata.get("age", "03 YEAR").upper()
    gender_str = metadata.get("gender", "FEMALE").upper()
    date_str = metadata.get("exam_date", "30/10/2026")
    ref_by = metadata.get("referring_doctor", "DR. HIRA ASIF").upper()
    mr_num = metadata.get("mrn", "2026/016228")

    demo_data = [
        [
            Paragraph("NAME:", table_label), Paragraph(name_str, table_val),
            Paragraph("AGE:", table_label), Paragraph(age_str, table_val),
        ],
        [
            Paragraph("DATE:", table_label), Paragraph(date_str, table_val),
            Paragraph("GENDER:", table_label), Paragraph(gender_str, table_val),
        ],
        [
            Paragraph("REF. BY:", table_label), Paragraph(ref_by, table_val),
            Paragraph("M.R#:", table_label), Paragraph(mr_num, table_val),
        ],
    ]

    demo_table = Table(demo_data, colWidths=[65, 230, 65, 180])
    demo_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ]))
    elements.append(demo_table)
    elements.append(Spacer(1, 10))

    # 3. INTERPRETATION
    elements.append(Paragraph("<u><b>INTERPRETATION:</b></u>", section_head))
    
    paragraphs = clinical_data.get("interpretation_paragraphs", [])
    if not paragraphs and "interpretation_text" in clinical_data:
        paragraphs = [p.strip() for p in clinical_data["interpretation_text"].split("\n") if p.strip()]

    for p_text in paragraphs:
        elements.append(Paragraph(p_text, body_style))

    elements.append(Spacer(1, 8))

    # 4. IMPRESSION
    elements.append(Paragraph("<u><b>IMPRESSION:</b></u>", section_head))
    elements.append(Paragraph(clinical_data.get("impression", ""), body_style))
    elements.append(Spacer(1, 8))

    # 5. CONCLUSION
    elements.append(Paragraph("<u><b>CONCLUSION:</b></u>", section_head))
    elements.append(Paragraph(clinical_data.get("conclusion", ""), body_style))
    elements.append(Spacer(1, 10))

    # Optional Waveform Snapshot snippet
    if waveform_image_path and os.path.exists(waveform_image_path):
        try:
            elements.append(Paragraph("<b>REPRESENTATIVE EEG EPOCH (PAROXYSMAL DISCHARGE):</b>", section_head))
            w_img = RLImage(waveform_image_path, width=540, height=130)
            elements.append(w_img)
            elements.append(Spacer(1, 10))
        except Exception as e:
            print(f"Error adding waveform snippet: {e}")

    # 6. Neurologist Sign-Off Block
    doctor_info = clinical_data.get("neurologist", {})
    doc_name = doctor_info.get("name", "DR. HIRA ASIF")
    doc_qual = doctor_info.get("qualifications", "MBBS, FCPS (Neurology)")

    sig_data = [
        [
            Paragraph(f"<b>NEUROLOGIST:</b><br/>"
                      f"<b>{doc_name}</b><br/>"
                      f"<font color='#555555'>{doc_qual}</font>", body_style),
            Paragraph("<b>SIGNATURE:</b> ___________________________<br/>"
                      "<font size=7 color='#777'>Electronically Authenticated Diagnostic Record</font>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 16),
    ]))
    
    elements.append(KeepTogether([sig_table]))

    # Build PDF
    doc.build(elements, canvasmaker=NumberedCanvas)
    return output_pdf_path
