/**
 * NeuroSense EEG Diagnostic Studio - Frontend Application
 */

let currentAnalysis = null;
let currentRotation = 90;

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }

  setupTabs();
  setupEventListeners();
  loadSavedSettings();

  // Auto-run analysis on bundled sample src.jpg on first visit
  analyzeEEG({ useSample: true });
});

function setupTabs() {
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));

      tab.classList.add("active");
      const targetId = tab.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.remove("hidden");
      }

      if (targetId === "tab-waveforms") {
        renderWaveforms();
      }
    });
  });
}

function setupEventListeners() {
  // Load sample buttons
  document.getElementById("btnLoadSample")?.addEventListener("click", () => {
    analyzeEEG({ useSample: true });
  });
  document.getElementById("dropZoneSampleBtn")?.addEventListener("click", (e) => {
    e.stopPropagation();
    analyzeEEG({ useSample: true });
  });

  // File upload input
  const fileInput = document.getElementById("fileInput");
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      analyzeEEG({ file: e.target.files[0] });
    }
  });

  // Drag and drop
  const dropZone = document.getElementById("dropZone");
  ["dragenter", "dragover"].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone?.classList.remove("hidden");
    }, false);
  });
  ["dragleave", "drop"].forEach(eventName => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      if (eventName === "drop" && e.dataTransfer.files && e.dataTransfer.files[0]) {
        analyzeEEG({ file: e.dataTransfer.files[0] });
      }
      dropZone?.classList.add("hidden");
    }, false);
  });

  // Rotation controls
  document.querySelectorAll(".btn-rotate").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".btn-rotate").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRotation = parseInt(btn.getAttribute("data-deg"), 10);

      const img = document.getElementById("imgOrientedDisplay");
      if (img) {
        img.style.transform = `rotate(${currentRotation - 90}deg)`;
      }
    });
  });

  // Copy report text button
  document.getElementById("btnCopyReportText")?.addEventListener("click", () => {
    if (!currentAnalysis) return;
    const text = formatClinicalText(currentAnalysis);
    navigator.clipboard.writeText(text).then(() => {
      alert("Formatted Clinical EEG Report copied to clipboard!");
    });
  });

  // Settings modal
  const settingsModal = document.getElementById("settingsModal");
  document.getElementById("btnSettings")?.addEventListener("click", () => {
    settingsModal?.classList.remove("hidden");
  });
  document.getElementById("btnCancelSettings")?.addEventListener("click", () => {
    settingsModal?.classList.add("hidden");
  });
  document.getElementById("btnSaveSettings")?.addEventListener("click", () => {
    const key = document.getElementById("inputGeminiKey")?.value || "";
    localStorage.setItem("neurosense_gemini_key", key.trim());
    settingsModal?.classList.add("hidden");
    alert("API settings saved!");
  });

  // Edit findings modal
  const editModal = document.getElementById("editModal");
  document.getElementById("btnEditFindings")?.addEventListener("click", openEditModal);
  document.getElementById("btnCancelEdit")?.addEventListener("click", () => editModal?.classList.add("hidden"));
  document.getElementById("btnDiscardEdit")?.addEventListener("click", () => editModal?.classList.add("hidden"));
  document.getElementById("btnSaveAndRegenerate")?.addEventListener("click", saveAndRegeneratePDF);

  // Resize listener for waveform canvas
  window.addEventListener("resize", () => {
    if (document.getElementById("tab-waveforms") && !document.getElementById("tab-waveforms").classList.contains("hidden")) {
      renderWaveforms();
    }
  });
}

function loadSavedSettings() {
  const savedKey = localStorage.getItem("neurosense_gemini_key");
  if (savedKey) {
    const input = document.getElementById("inputGeminiKey");
    if (input) input.value = savedKey;
    const badge = document.getElementById("engineBadgeText");
    if (badge) badge.textContent = "Offline Expert Engine + Gemini AI Vision Active";
  }
}

async function analyzeEEG({ useSample = false, file = null }) {
  const overlay = document.getElementById("loadingOverlay");
  overlay?.classList.remove("hidden");

  const formData = new FormData();
  formData.append("use_sample", useSample ? "true" : "false");
  formData.append("rotation", currentRotation.toString());

  const apiKey = localStorage.getItem("neurosense_gemini_key");
  if (apiKey) {
    formData.append("gemini_api_key", apiKey);
  }

  if (file) {
    formData.append("file", file);
  }

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Analysis request failed");
    }

    const data = await response.json();
    currentAnalysis = data;
    renderAnalysisResults(data);
  } catch (error) {
    console.error("Analysis Error:", error);
    alert(`Analysis Failed: ${error.message}`);
  } finally {
    overlay?.classList.add("hidden");
  }
}

function renderAnalysisResults(data) {
  const meta = data.metadata || {};
  const clinical = data.clinical_report || {};
  const signals = data.signals || {};
  const bands = signals.bands || {};

  // Status Banner
  const isAbnormal = clinical.finding_severity === "Abnormal";
  const bannerBadge = document.getElementById("bannerSeverityBadge");
  const bannerDiag = document.getElementById("bannerDiagnosisTitle");
  const bannerBrief = document.getElementById("bannerPatientBrief");
  const bannerTiming = document.getElementById("bannerTiming");
  const bannerIcon = document.getElementById("statusIcon");

  if (bannerBadge) {
    bannerBadge.textContent = isAbnormal ? "ABNORMAL EEG" : "NORMAL EEG";
    bannerBadge.className = isAbnormal
      ? "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-900/80 text-red-200 border border-red-700"
      : "text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200 border border-emerald-700";
  }

  if (bannerIcon) {
    bannerIcon.className = isAbnormal
      ? "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-red-900/60 text-red-300 border border-red-700"
      : "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-emerald-900/60 text-emerald-300 border border-emerald-700";
  }

  if (bannerDiag) {
    bannerDiag.textContent = clinical.primary_diagnosis || "Primary Generalized Epileptiform Abnormality";
  }

  if (bannerBrief) {
    bannerBrief.textContent = `Patient: ${meta.patient_name || 'Unknown'} (${meta.age || ''}, ${meta.gender || ''}) • ${meta.patient_state || 'Sedated asleep'}`;
  }

  if (bannerTiming) {
    if (signals.paroxysm_detected) {
      bannerTiming.textContent = `Synchronous paroxysmal discharge detected (${signals.involvement_pct}% channels involved) • Duration: ${signals.paroxysm_duration_sec}s`;
    } else {
      bannerTiming.textContent = "Physiological sleep architecture without focal or generalized epileptiform discharges.";
    }
  }

  // PDF Download Link
  const pdfBtn = document.getElementById("btnDownloadPdf");
  if (pdfBtn && data.pdf_url) {
    pdfBtn.href = data.pdf_url;
  }
  const comparePdf = document.getElementById("btnComparePdfLink");
  if (comparePdf && data.pdf_url) {
    comparePdf.href = data.pdf_url;
  }

  // Demographics in Tab 1
  setText("valPatientName", meta.patient_name?.toUpperCase());
  setText("valPatientAge", meta.age?.toUpperCase());
  setText("valPatientGender", meta.gender?.toUpperCase());
  setText("valExamDate", meta.exam_date);
  setText("valRefBy", meta.referring_doctor?.toUpperCase() || "DR. HIRA ASIF");
  setText("valMRN", meta.mrn || meta.exam_id);

  // Interpretation Paragraphs
  const interpBox = document.getElementById("interpretationContainer");
  if (interpBox && clinical.interpretation_paragraphs) {
    interpBox.innerHTML = clinical.interpretation_paragraphs
      .map(p => `<p class="leading-relaxed">• ${p}</p>`)
      .join("");
  }

  // Impression & Conclusion
  setText("valImpression", clinical.impression);
  setText("valConclusion", clinical.conclusion);

  // Doctor Info
  if (clinical.neurologist) {
    setText("valDocName", clinical.neurologist.name);
    setText("valDocQual", clinical.neurologist.qualifications);
  }

  // Primary Diagnosis & Differentials
  setText("diagPrimary", clinical.primary_diagnosis);
  const diffBox = document.getElementById("diagDifferentials");
  if (diffBox && clinical.differential_diagnoses) {
    diffBox.innerHTML = clinical.differential_diagnoses
      .map(d => `<li class="flex items-start gap-1.5"><span class="text-cyan-400 font-bold">•</span><span>${d}</span></li>`)
      .join("");
  }

  const recBox = document.getElementById("diagRecommendations");
  if (recBox && clinical.recommended_actions) {
    recBox.innerHTML = clinical.recommended_actions
      .map(r => `<li class="flex items-start gap-2 bg-[#0e1422] p-2 rounded border border-neuro-border"><i data-lucide="arrow-right-circle" class="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0"></i><span>${r}</span></li>`)
      .join("");
  }

  // Epoch Snippet Image
  const snippetImg = document.getElementById("imgSnippet");
  if (snippetImg && data.snippet_url) {
    snippetImg.src = data.snippet_url;
  }

  // Spectral Bars in Tab 3
  if (bands.delta_pct !== undefined) {
    setBar("barDelta", "txtDeltaPct", bands.delta_pct, `Delta (${bands.delta_pct}%) • Dominant Slowing: ${bands.delta_peak_hz || 1.5} Hz`);
    setBar("barTheta", "txtThetaPct", bands.theta_pct, `Theta (${bands.theta_pct}%) • Background Theta: ${bands.theta_peak_hz || 5.0} Hz`);
    setBar("barAlpha", "txtAlphaPct", bands.alpha_pct, `Alpha (${bands.alpha_pct}%)`);
    setBar("barBeta", "txtBetaPct", bands.beta_pct, `Beta (${bands.beta_pct}%) • Fast Activity: ${bands.beta_peak_hz || 16.0} Hz`);
  }

  // Channel Stats Grid in Tab 2
  renderChannelGrid(signals.channel_stats);

  // Compare Tab Content
  const compInterp = document.getElementById("compareInterpretationText");
  if (compInterp && clinical.interpretation_paragraphs) {
    compInterp.innerHTML = clinical.interpretation_paragraphs.map(p => `<p>• ${p}</p>`).join("");
  }
  setText("compareImpressionText", clinical.impression);
  setText("compareConclusionText", clinical.conclusion);

  if (window.lucide) {
    lucide.createIcons();
  }

  renderWaveforms();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function setBar(barId, txtId, pct, label) {
  const bar = document.getElementById(barId);
  const txt = document.getElementById(txtId);
  if (bar) bar.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  if (txt) txt.textContent = label;
}

function renderChannelGrid(channelStats) {
  const grid = document.getElementById("channelGrid");
  if (!grid || !channelStats) return;

  grid.innerHTML = Object.entries(channelStats).map(([chName, stats]) => {
    const isAb = stats.is_abnormal;
    return `
      <div class="p-2.5 rounded-lg bg-[#0e1422] border ${isAb ? 'border-red-900/60 bg-red-950/20' : 'border-neuro-border'}">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold text-white">${chName}</span>
          <span class="text-[9px] px-1.5 py-0.5 rounded ${isAb ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-300'}">${isAb ? 'PAROXYSM' : 'NORMAL'}</span>
        </div>
        <div class="text-[10px] text-slate-400">Vpp: <span class="text-slate-200 font-mono">${stats.vpp_uv} uV</span></div>
        <div class="text-[10px] text-slate-400">RMS: <span class="text-slate-200 font-mono">${stats.rms_uv} uV</span></div>
      </div>
    `;
  }).join("");
}

function renderWaveforms() {
  if (!currentAnalysis || !currentAnalysis.waveforms) return;

  const canvas = document.getElementById("waveformCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const waveforms = currentAnalysis.waveforms;
  const channelNames = waveforms.channel_names || Object.keys(waveforms.channels);
  const timePts = waveforms.time;
  const numCh = channelNames.length;

  const width = canvas.width;
  const height = canvas.height;

  // Clear canvas
  ctx.fillStyle = "#070b16";
  ctx.fillRect(0, 0, width, height);

  const leftMargin = 120;
  const rightMargin = 40;
  const topMargin = 40;
  const bottomMargin = 50;

  const plotW = width - leftMargin - rightMargin;
  const plotH = height - topMargin - bottomMargin;
  const chH = plotH / numCh;

  // 1. Draw vertical time grid lines (10 divisions = 10 seconds)
  ctx.strokeStyle = "#172238";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);

  const durationSec = 10.0;
  for (let s = 0; s <= 10; s++) {
    const x = leftMargin + (s / durationSec) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, topMargin);
    ctx.lineTo(x, height - bottomMargin);
    ctx.stroke();

    // Time label at bottom
    ctx.fillStyle = "#64748b";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`14:00:${39 + s}s`, x, height - bottomMargin + 18);
    ctx.fillText(`${s}s`, x, height - bottomMargin + 32);
  }
  ctx.setLineDash([]);

  // 2. Highlight detected paroxysm interval
  const signals = currentAnalysis.signals || {};
  if (signals.paroxysm_detected && signals.paroxysm_start_sec !== null && signals.paroxysm_end_sec !== null) {
    const burstX1 = leftMargin + (signals.paroxysm_start_sec / durationSec) * plotW;
    const burstX2 = leftMargin + (signals.paroxysm_end_sec / durationSec) * plotW;

    ctx.fillStyle = "rgba(239, 68, 68, 0.08)";
    ctx.fillRect(burstX1, topMargin, burstX2 - burstX1, plotH);

    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(burstX1, topMargin, burstX2 - burstX1, plotH);

    // Label on top
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("▲ DETECTED GENERALIZED SPIKE-AND-WAVE BURST", burstX1 + 8, topMargin - 8);
  }

  // 3. Draw each channel waveform
  const numPts = timePts.length;

  channelNames.forEach((chName, idx) => {
    const baselineY = topMargin + (idx + 0.5) * chH;
    const sig = waveforms.channels[chName];
    if (!sig) return;

    // Channel baseline divider line
    ctx.strokeStyle = "#101827";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, baselineY);
    ctx.lineTo(width - rightMargin, baselineY);
    ctx.stroke();

    // Channel label on left
    ctx.fillStyle = chName === "Photic" ? "#f59e0b" : "#94a3b8";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(chName, leftMargin - 15, baselineY + 4);

    // Waveform stroke
    ctx.beginPath();
    const isAbnormalCh = signals.channel_stats?.[chName]?.is_abnormal;

    if (chName === "Photic") {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1.5;
    } else if (isAbnormalCh) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 1.2;
    }

    const scaleY = 0.5; // pixel deflection per uV

    for (let i = 0; i < numPts; i++) {
      const x = leftMargin + (i / (numPts - 1)) * plotW;
      const y = baselineY - sig[i] * scaleY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  });
}

function openEditModal() {
  if (!currentAnalysis) return;
  const meta = currentAnalysis.metadata || {};
  const clinical = currentAnalysis.clinical_report || {};

  document.getElementById("editName").value = meta.patient_name || "";
  document.getElementById("editAge").value = meta.age || "";
  document.getElementById("editGender").value = meta.gender || "";
  document.getElementById("editDate").value = meta.exam_date || "";
  document.getElementById("editMRN").value = meta.mrn || "";
  document.getElementById("editRefDoctor").value = meta.referring_doctor || "Dr. Hira Asif";
  document.getElementById("editImpression").value = clinical.impression || "";
  document.getElementById("editConclusion").value = clinical.conclusion || "";

  document.getElementById("editModal")?.classList.remove("hidden");
}

async function saveAndRegeneratePDF() {
  if (!currentAnalysis) return;

  const updatedMeta = {
    ...currentAnalysis.metadata,
    patient_name: document.getElementById("editName").value,
    age: document.getElementById("editAge").value,
    gender: document.getElementById("editGender").value,
    exam_date: document.getElementById("editDate").value,
    mrn: document.getElementById("editMRN").value,
    referring_doctor: document.getElementById("editRefDoctor").value,
  };

  const updatedClinical = {
    ...currentAnalysis.clinical_report,
    impression: document.getElementById("editImpression").value,
    conclusion: document.getElementById("editConclusion").value,
  };

  const snippetFile = currentAnalysis.snippet_url ? currentAnalysis.snippet_url.split("/").pop() : null;

  try {
    const res = await fetch("/api/regenerate_pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: updatedMeta,
        clinical_report: updatedClinical,
        snippet_filename: snippetFile
      })
    });

    if (!res.ok) throw new Error("Failed to re-generate PDF");
    const data = await res.json();

    currentAnalysis.metadata = updatedMeta;
    currentAnalysis.clinical_report = updatedClinical;
    currentAnalysis.pdf_url = data.pdf_url;

    renderAnalysisResults(currentAnalysis);
    document.getElementById("editModal")?.classList.add("hidden");
    alert("Report updated and official PDF regenerated successfully!");
  } catch (err) {
    alert(`Regeneration Error: ${err.message}`);
  }
}

function formatClinicalText(data) {
  const m = data.metadata || {};
  const c = data.clinical_report || {};
  return `ELECTROENCEPHALOGRAPHY (EEG) REPORT
--------------------------------------------------
PATIENT: ${m.patient_name}  |  AGE: ${m.age}  |  GENDER: ${m.gender}
DATE: ${m.exam_date}  |  MRN: ${m.mrn}  |  REF: ${m.referring_doctor}
STATE: ${m.patient_state}
MONTAGE: ${m.montage_type} (${m.channels_count} channels)
CALIBRATION: ${m.sensitivity}, ${m.paper_speed}, ${m.notch_filter}

INTERPRETATION:
${(c.interpretation_paragraphs || []).map(p => "• " + p).join("\n")}

IMPRESSION:
${c.impression}

CONCLUSION:
${c.conclusion}

PRIMARY DIAGNOSIS:
${c.primary_diagnosis}
--------------------------------------------------`;
}
