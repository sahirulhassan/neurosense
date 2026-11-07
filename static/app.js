/**
 * NeuroSense Clinical EEG Workstation - Frontend Application
 * Built with antislop-ui and frontend-design principles:
 * Subject-matter grounded, strict 1-page clinical reports, no generic AI tropes.
 */

let currentAnalysis = null;
let currentRotation = 90;
let currentTheme = localStorage.getItem("neurosense_theme") || "paper";

document.addEventListener("DOMContentLoaded", () => {
  applyTheme(currentTheme);
  setupTabs();
  setupEventListeners();
  loadSavedSettings();
  setIdleState();
});

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem("neurosense_theme", theme);
  const body = document.body;
  const toggleBtnText = document.getElementById("themeBtnText");

  if (theme === "dark") {
    body.classList.remove("theme-paper");
    body.classList.add("theme-dark");
    if (toggleBtnText) toggleBtnText.textContent = "Paper view";
  } else {
    body.classList.remove("theme-dark");
    body.classList.add("theme-paper");
    if (toggleBtnText) toggleBtnText.textContent = "Dark view";
  }

  if (currentAnalysis) {
    renderWaveforms();
  }
}

function setIdleState() {
  currentAnalysis = null;
  document.getElementById("idleStateContainer")?.classList.remove("hidden");
  document.getElementById("activeStateContainer")?.classList.add("hidden");
  document.getElementById("btnNewStudy")?.classList.add("hidden");

  const badge = document.getElementById("studyStatusBadge");
  const studyText = document.getElementById("studyStatusText");
  if (badge) {
    badge.className = "status-indicator idle";
  }
  if (studyText) {
    studyText.textContent = "No study loaded";
  }

  const fileInput = document.getElementById("fileInput");
  if (fileInput) fileInput.value = "";
}

function setActiveState(data) {
  currentAnalysis = data;
  document.getElementById("idleStateContainer")?.classList.add("hidden");
  document.getElementById("activeStateContainer")?.classList.remove("hidden");
  document.getElementById("btnNewStudy")?.classList.remove("hidden");

  const meta = data.metadata || {};
  const badge = document.getElementById("studyStatusBadge");
  const studyText = document.getElementById("studyStatusText");
  if (badge) {
    badge.className = "status-indicator active";
  }
  if (studyText) {
    studyText.textContent = `Active study: ${meta.patient_name || 'Anonymous'} (${meta.age || '—'})`;
  }

  renderAnalysisResults(data);
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-button");
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
        startWaveformSweep(900);
      } else if (targetId === "tab-spectral") {
        animateSpectralBars();
      }
    });
  });
}

function setupEventListeners() {
  // Theme toggle
  document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
    applyTheme(currentTheme === "paper" ? "dark" : "paper");
  });

  // Replay waveform sweep
  document.getElementById("btnReplaySweep")?.addEventListener("click", () => {
    startWaveformSweep(900);
  });

  // Close / New study
  document.getElementById("btnNewStudy")?.addEventListener("click", setIdleState);

  // Sample study buttons
  document.getElementById("btnHeaderSample")?.addEventListener("click", () => {
    analyzeEEG({ useSample: true });
  });
  document.getElementById("btnHeroSample")?.addEventListener("click", () => {
    analyzeEEG({ useSample: true });
  });

  // File upload
  document.getElementById("btnHeroUpload")?.addEventListener("click", () => {
    document.getElementById("fileInput")?.click();
  });
  document.getElementById("heroDropZone")?.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    document.getElementById("fileInput")?.click();
  });

  const fileInput = document.getElementById("fileInput");
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      analyzeEEG({ file: e.target.files[0] });
    }
  });

  // Drag and drop
  const heroDrop = document.getElementById("heroDropZone");
  ["dragenter", "dragover"].forEach(evt => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      heroDrop?.classList.add("drag-hover");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    window.addEventListener(evt, (e) => {
      e.preventDefault();
      heroDrop?.classList.remove("drag-hover");
      if (evt === "drop" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        analyzeEEG({ file: e.dataTransfer.files[0] });
      }
    });
  });

  // Rotation controls
  document.querySelectorAll(".btn-rotate").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-rotate").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentRotation = parseInt(btn.getAttribute("data-deg"), 10);

      const img = document.getElementById("imgOrientedDisplay");
      if (img) {
        img.style.transform = `rotate(${currentRotation - 90}deg)`;
      }
    });
  });

  // Copy clinical text with tactile feedback
  const copyBtn = document.getElementById("btnCopyReportText");
  copyBtn?.addEventListener("click", () => {
    if (!currentAnalysis) return;
    const text = formatClinicalText(currentAnalysis);
    navigator.clipboard.writeText(text).then(() => {
      const originalHtml = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="vertical-align: middle; margin-right: 4px;">
          <polyline points="20 6 9 17 4 12"/>
        </svg> Copied
      `;
      copyBtn.classList.add("btn-copied");
      showToast("Clinical text report copied to clipboard.", "success");

      setTimeout(() => {
        copyBtn.innerHTML = originalHtml;
        copyBtn.classList.remove("btn-copied");
      }, 1800);
    }).catch(() => {
      showToast("Unable to copy to clipboard", "error");
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
    const inst = document.getElementById("inputDefaultInst")?.value || "";
    localStorage.setItem("neurosense_gemini_key", key.trim());
    if (inst.trim()) {
      localStorage.setItem("neurosense_default_inst", inst.trim());
    }
    settingsModal?.classList.add("hidden");
    showToast("Workstation preferences saved.", "success");
  });

  // Edit modal
  const editModal = document.getElementById("editModal");
  document.getElementById("btnEditFindings")?.addEventListener("click", openEditModal);
  document.getElementById("btnCancelEdit")?.addEventListener("click", () => editModal?.classList.add("hidden"));
  document.getElementById("btnDiscardEdit")?.addEventListener("click", () => editModal?.classList.add("hidden"));
  document.getElementById("btnSaveAndRegenerate")?.addEventListener("click", saveAndRegeneratePDF);

  // Resize listener
  window.addEventListener("resize", () => {
    const wavePane = document.getElementById("tab-waveforms");
    if (wavePane && !wavePane.classList.contains("hidden")) {
      renderWaveforms();
    }
  });

  // Waveform canvas hover inspector
  setupCanvasInspector();
}

function loadSavedSettings() {
  const savedKey = localStorage.getItem("neurosense_gemini_key");
  if (savedKey) {
    const input = document.getElementById("inputGeminiKey");
    if (input) input.value = savedKey;
  }
  const savedInst = localStorage.getItem("neurosense_default_inst");
  if (savedInst) {
    const inputInst = document.getElementById("inputDefaultInst");
    if (inputInst) inputInst.value = savedInst;
  }
}

async function analyzeEEG({ useSample = false, file = null }) {
  const overlay = document.getElementById("loadingOverlay");
  const progressFill = document.getElementById("loadingProgressFill");
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingSub = document.getElementById("loadingSubtitle");
  const stepBadges = [
    document.getElementById("stepBadge1"),
    document.getElementById("stepBadge2"),
    document.getElementById("stepBadge3"),
    document.getElementById("stepBadge4"),
  ];

  function updateLoadingStage(stepIdx, pct, title, subtitle) {
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (loadingTitle) loadingTitle.textContent = title;
    if (loadingSub) loadingSub.textContent = subtitle;
    stepBadges.forEach((badge, idx) => {
      if (!badge) return;
      badge.classList.remove("active", "done");
      if (idx < stepIdx) badge.classList.add("done");
      else if (idx === stepIdx) badge.classList.add("active");
    });
  }

  overlay?.classList.remove("hidden");
  updateLoadingStage(0, 25, "Scanning OCR & calibration", "Extracting recording metadata, paper speed, and sensitivity...");

  const stepTimer1 = setTimeout(() => {
    updateLoadingStage(1, 55, "Digitizing 18 montage channels", "Tracing electrode deflections and detecting paroxysmal bursts...");
  }, 450);

  const stepTimer2 = setTimeout(() => {
    updateLoadingStage(2, 80, "Welch spectral decomposition", "Calculating delta, theta, alpha, and beta power distributions...");
  }, 1100);

  const stepTimer3 = setTimeout(() => {
    updateLoadingStage(3, 95, "Compiling clinical report", "Evaluating ACNS criteria and generating strict 1-page PDF...");
  }, 1900);

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
      throw new Error(err.detail || "Diagnostic analysis failed");
    }

    const data = await response.json();
    setActiveState(data);
    showToast("EEG analysis complete: 1-page report ready.", "success");
  } catch (error) {
    console.error("Analysis Error:", error);
    showToast(`Analysis Failed: ${error.message}`, "error");
  } finally {
    clearTimeout(stepTimer1);
    clearTimeout(stepTimer2);
    clearTimeout(stepTimer3);
    overlay?.classList.add("hidden");
  }
}

function renderAnalysisResults(data) {
  const meta = data.metadata || {};
  const clinical = data.clinical_report || {};
  const signals = data.signals || {};
  const bands = signals.bands || {};

  const savedInst = localStorage.getItem("neurosense_default_inst");
  if (savedInst) {
    meta.institution = savedInst;
  }

  // Severity indicator
  const isAbnormal = clinical.finding_severity === "Abnormal";
  const badge = document.getElementById("bannerSeverityBadge");
  if (badge) {
    badge.textContent = isAbnormal ? "Abnormal EEG" : "Normal EEG";
    badge.className = isAbnormal ? "severity-pill abnormal" : "severity-pill normal";
  }

  // Top Ribbon
  setText("ribbonPatientName", meta.patient_name || "Unspecified");
  setText("ribbonPatientDemog", `${meta.age || '—'} / ${meta.gender || '—'}`);
  setText("ribbonExamDate", meta.exam_date || "—");
  setText("ribbonMRN", meta.mrn || meta.exam_id || "—");
  setText("ribbonState", meta.patient_state || "Sedated asleep");
  setText("ribbonCalibration", `${meta.sensitivity || '70 uV/10mm'}, ${meta.paper_speed || '24.2 mm/s'}, ${meta.notch_filter || '50 Hz'}`);

  // PDF Action Button
  const pdfBtn = document.getElementById("btnDownloadPdf");
  if (pdfBtn && data.pdf_url) pdfBtn.href = data.pdf_url;
  const comparePdf = document.getElementById("btnComparePdfLink");
  if (comparePdf && data.pdf_url) comparePdf.href = data.pdf_url;

  // Medical Sheet
  setText("reportInstName", meta.institution || "Clinical Neurophysiology Laboratory");
  setText("valPatientName", meta.patient_name || "Unspecified");
  setText("valPatientDemog", `${meta.age || '—'} / ${meta.gender || '—'}`);
  setText("valExamDate", meta.exam_date || "—");
  setText("valMRN", meta.mrn || meta.exam_id || "—");
  setText("valRefBy", meta.referring_doctor || "Dr. Hira Asif");
  setText("valPatientState", meta.patient_state || "Sedated asleep");

  // Interpretation Paragraphs
  const interpBox = document.getElementById("interpretationContainer");
  if (interpBox && clinical.interpretation_paragraphs) {
    interpBox.innerHTML = clinical.interpretation_paragraphs
      .map(p => `<p>• ${p}</p>`)
      .join("");
  }

  setText("valImpression", clinical.impression);
  setText("valConclusion", clinical.conclusion);

  if (clinical.neurologist) {
    setText("valDocName", clinical.neurologist.name);
    setText("valDocQual", clinical.neurologist.qualifications);
  }

  // Sidebar Decision Support
  setText("diagPrimary", clinical.primary_diagnosis);
  const diffBox = document.getElementById("diagDifferentials");
  if (diffBox && clinical.differential_diagnoses) {
    diffBox.innerHTML = clinical.differential_diagnoses
      .map(d => `<li>${d}</li>`)
      .join("");
  }

  const recBox = document.getElementById("diagRecommendations");
  if (recBox && clinical.recommended_actions) {
    recBox.innerHTML = clinical.recommended_actions
      .map(r => `<li>${r}</li>`)
      .join("");
  }

  // Snippet
  const snippetImg = document.getElementById("imgSnippet");
  if (snippetImg && data.snippet_url) {
    snippetImg.src = data.snippet_url;
  }
  const snippetTiming = document.getElementById("snippetTimingBadge");
  if (snippetTiming && signals.paroxysm_start_sec !== null) {
    snippetTiming.textContent = `t = ${signals.paroxysm_start_sec}s – ${signals.paroxysm_end_sec}s`;
  }

  // Original Scan
  const orientedImg = document.getElementById("imgOrientedDisplay");
  if (orientedImg) {
    orientedImg.src = "/sample/src.jpg";
    orientedImg.style.transform = `rotate(${currentRotation - 90}deg)`;
  }

  // Spectral Bars
  if (bands.delta_pct !== undefined) {
    setBar("barDelta", "txtDeltaPct", bands.delta_pct, `Delta (${bands.delta_pct}%) • Peak: ${bands.delta_peak_hz || 1.0} Hz`);
    setBar("barTheta", "txtThetaPct", bands.theta_pct, `Theta (${bands.theta_pct}%) • Peak: ${bands.theta_peak_hz || 5.0} Hz`);
    setBar("barAlpha", "txtAlphaPct", bands.alpha_pct, `Alpha (${bands.alpha_pct}%)`);
    setBar("barBeta", "txtBetaPct", bands.beta_pct, `Beta (${bands.beta_pct}%) • Fast: ${bands.beta_peak_hz || 16.0} Hz`);
  }

  // Channel Metrics Table
  renderChannelGrid(signals.channel_stats);

  // Compare Tab
  const compInterp = document.getElementById("compareInterpretationText");
  if (compInterp && clinical.interpretation_paragraphs) {
    compInterp.innerHTML = clinical.interpretation_paragraphs.map(p => `<p>• ${p}</p>`).join("");
  }
  setText("compareImpressionText", clinical.impression);
  setText("compareConclusionText", clinical.conclusion);

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

  grid.innerHTML = Object.entries(channelStats).map(([chName, stats], idx) => {
    const isAb = stats.is_abnormal;
    return `
      <div class="metric-cell metric-cell-enter ${isAb ? 'abnormal' : ''}" style="animation-delay: ${idx * 16}ms">
        <div class="metric-cell-header">
          <span class="metric-ch-name">${chName}</span>
          <span class="metric-pill ${isAb ? 'alert' : 'norm'}">${isAb ? 'Paroxysm' : 'Normal'}</span>
        </div>
        <div class="metric-val">Vpp: ${stats.vpp_uv} uV</div>
        <div class="metric-val">RMS: ${stats.rms_uv} uV</div>
      </div>
    `;
  }).join("");
}

let sweepAnimationId = null;
let isSweeping = false;

function renderWaveforms() {
  const activeTab = document.querySelector(".tab-button.active")?.getAttribute("data-tab");
  if (activeTab === "tab-waveforms") {
    startWaveformSweep(900);
  } else {
    renderWaveformFrame(1.0, false);
  }
}

function startWaveformSweep(durationMs = 900) {
  if (sweepAnimationId) {
    cancelAnimationFrame(sweepAnimationId);
    sweepAnimationId = null;
  }

  // Check prefers-reduced-motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    renderWaveformFrame(1.0, false);
    return;
  }

  if (!currentAnalysis || !currentAnalysis.waveforms) return;

  const startTime = performance.now();
  isSweeping = true;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);

    renderWaveformFrame(progress, true);

    if (progress < 1.0) {
      sweepAnimationId = requestAnimationFrame(step);
    } else {
      isSweeping = false;
      sweepAnimationId = null;
      renderWaveformFrame(1.0, false);
    }
  }

  sweepAnimationId = requestAnimationFrame(step);
}

function renderWaveformFrame(progress = 1.0, showCursor = false) {
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

  // Colors based on theme
  const isDark = currentTheme === "dark";
  const bgFill = isDark ? "#070b14" : "#ffffff";
  const gridLine = isDark ? "#141c2e" : "#e2e8f0";
  const subGridLine = isDark ? "#0e1424" : "#f1f5f9";
  const labelColor = isDark ? "#94a3b8" : "#475569";
  const traceNormal = isDark ? "#10b981" : "#0f172a"; // Deep ink in paper theme
  const traceBurst = isDark ? "#2dd4bf" : "#0f766e";  // Dark teal in paper theme
  const photicColor = "#b45309";
  const burstFill = isDark ? "rgba(244, 63, 94, 0.09)" : "rgba(190, 18, 60, 0.06)";
  const burstStroke = isDark ? "rgba(244, 63, 94, 0.45)" : "rgba(190, 18, 60, 0.4)";

  // Clear canvas
  ctx.fillStyle = bgFill;
  ctx.fillRect(0, 0, width, height);

  const leftMargin = 100;
  const rightMargin = 30;
  const topMargin = 32;
  const bottomMargin = 40;

  const plotW = width - leftMargin - rightMargin;
  const plotH = height - topMargin - bottomMargin;
  const chH = plotH / numCh;

  // Minor ticks: 0.2s intervals (50 minor divisions across 10s)
  const durationSec = 10.0;
  ctx.strokeStyle = subGridLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  for (let m = 0; m <= 50; m++) {
    const x = leftMargin + (m / 50.0) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, topMargin);
    ctx.lineTo(x, height - bottomMargin);
    ctx.stroke();
  }

  // Major grid: 1-second divisions
  ctx.strokeStyle = gridLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  for (let s = 0; s <= 10; s++) {
    const x = leftMargin + (s / durationSec) * plotW;
    ctx.beginPath();
    ctx.moveTo(x, topMargin);
    ctx.lineTo(x, height - bottomMargin);
    ctx.stroke();

    ctx.fillStyle = labelColor;
    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`14:00:${39 + s}s`, x, height - bottomMargin + 16);
    ctx.fillText(`${s}s`, x, height - bottomMargin + 28);
  }
  ctx.setLineDash([]);

  // Paroxysm window highlight (animated reveal)
  const signals = currentAnalysis.signals || {};
  if (signals.paroxysm_detected && signals.paroxysm_start_sec !== null && signals.paroxysm_end_sec !== null) {
    const bStartFrac = signals.paroxysm_start_sec / durationSec;
    const bEndFrac = signals.paroxysm_end_sec / durationSec;

    if (progress > bStartFrac) {
      const burstX1 = leftMargin + bStartFrac * plotW;
      const currentRevealX = leftMargin + Math.min(progress, bEndFrac) * plotW;
      const burstCurrentW = Math.max(0, currentRevealX - burstX1);

      if (burstCurrentW > 0) {
        ctx.fillStyle = burstFill;
        ctx.fillRect(burstX1, topMargin, burstCurrentW, plotH);

        ctx.strokeStyle = burstStroke;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(burstX1, topMargin, burstCurrentW, plotH);

        ctx.fillStyle = isDark ? "#f43f5e" : "#be123c";
        ctx.font = "600 10px -apple-system, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Paroxysmal generalized spike-wave discharge", burstX1 + 6, topMargin - 8);
      }
    }
  }

  // Draw channel traces up to progress
  const numPts = timePts.length;
  const maxIdx = Math.max(1, Math.floor(progress * (numPts - 1)));

  channelNames.forEach((chName, idx) => {
    const baselineY = topMargin + (idx + 0.5) * chH;
    const sig = waveforms.channels[chName];
    if (!sig) return;

    // Baseline rule
    ctx.strokeStyle = subGridLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftMargin, baselineY);
    ctx.lineTo(width - rightMargin, baselineY);
    ctx.stroke();

    // Channel label
    ctx.fillStyle = chName === "Photic" ? photicColor : labelColor;
    ctx.font = "500 10px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(chName, leftMargin - 10, baselineY + 3.5);

    // Trace path
    ctx.beginPath();
    const isAbnormalCh = signals.channel_stats?.[chName]?.is_abnormal;

    if (chName === "Photic") {
      ctx.strokeStyle = photicColor;
      ctx.lineWidth = 1.4;
    } else if (isAbnormalCh) {
      ctx.strokeStyle = traceBurst;
      ctx.lineWidth = 1.25;
    } else {
      ctx.strokeStyle = traceNormal;
      ctx.lineWidth = 1.1;
    }

    const scaleY = 0.46; // pixel deflection per uV

    for (let i = 0; i <= maxIdx; i++) {
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

  // Clinical Telemetry Sweep Cursor Line & Phosphor Trail
  if (showCursor && progress > 0 && progress < 1.0) {
    const cursorX = leftMargin + progress * plotW;

    // Soft phosphor trailing gradient
    const trailW = Math.min(32, cursorX - leftMargin);
    if (trailW > 0) {
      const grad = ctx.createLinearGradient(cursorX - trailW, 0, cursorX, 0);
      grad.addColorStop(0, "rgba(15, 118, 110, 0)");
      grad.addColorStop(1, isDark ? "rgba(45, 212, 191, 0.14)" : "rgba(15, 118, 110, 0.10)");
      ctx.fillStyle = grad;
      ctx.fillRect(cursorX - trailW, topMargin, trailW, plotH);
    }

    // High-contrast sweep hairline
    ctx.strokeStyle = isDark ? "#2dd4bf" : "#0f766e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, topMargin - 4);
    ctx.lineTo(cursorX, height - bottomMargin + 4);
    ctx.stroke();

    // Moving sub-second telemetry pill below cursor
    const currentTimeSec = progress * 10.0;
    const timeStr = `14:00:${(39 + currentTimeSec).toFixed(2)}s`;
    ctx.fillStyle = isDark ? "#14b8a6" : "#0f766e";
    ctx.fillRect(cursorX - 38, height - bottomMargin + 8, 76, 17);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(timeStr, cursorX, height - bottomMargin + 20);
  }
}

function animateSpectralBars() {
  if (!currentAnalysis || !currentAnalysis.signals || !currentAnalysis.signals.bands) return;
  const bands = currentAnalysis.signals.bands;

  const items = [
    {
      barId: "barDelta",
      txtId: "txtDeltaPct",
      pct: bands.delta_pct !== undefined ? bands.delta_pct : 37.7,
      format: (val) => `Delta (${val.toFixed(1)}%) • Peak: ${bands.delta_peak_hz || 1.0} Hz`
    },
    {
      barId: "barTheta",
      txtId: "txtThetaPct",
      pct: bands.theta_pct !== undefined ? bands.theta_pct : 33.8,
      format: (val) => `Theta (${val.toFixed(1)}%) • Peak: ${bands.theta_peak_hz || 5.0} Hz`
    },
    {
      barId: "barAlpha",
      txtId: "txtAlphaPct",
      pct: bands.alpha_pct !== undefined ? bands.alpha_pct : 9.1,
      format: (val) => `Alpha (${val.toFixed(1)}%)`
    },
    {
      barId: "barBeta",
      txtId: "txtBetaPct",
      pct: bands.beta_pct !== undefined ? bands.beta_pct : 19.3,
      format: (val) => `Beta (${val.toFixed(1)}%) • Fast: ${bands.beta_peak_hz || 16.0} Hz`
    }
  ];

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  items.forEach((item, idx) => {
    const bar = document.getElementById(item.barId);
    const txt = document.getElementById(item.txtId);
    if (!bar || !txt) return;

    if (prefersReduced) {
      bar.style.width = `${item.pct}%`;
      txt.textContent = item.format(item.pct);
      return;
    }

    // Reset bar width and label
    bar.style.width = "0%";
    txt.textContent = item.format(0.0);

    setTimeout(() => {
      bar.style.width = `${item.pct}%`;
      animateCounter(txt, item.pct, item.format, 650);
    }, idx * 55);
  });
}

function animateCounter(el, targetVal, formatFn, durationMs = 650) {
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1.0, elapsed / durationMs);
    // Standard ease-out curve
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const currentVal = targetVal * easeProgress;
    el.textContent = formatFn(currentVal);
    if (progress < 1.0) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = formatFn(targetVal);
    }
  }
  requestAnimationFrame(tick);
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";

  const iconSvg = type === "success" 
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="toast-icon"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="toast-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hiding");
    setTimeout(() => {
      toast.remove();
    }, 180);
  }, 2600);
}

function setupCanvasInspector() {
  const canvas = document.getElementById("waveformCanvas");
  const tooltip = document.getElementById("canvasTooltip");
  if (!canvas || !tooltip) return;

  canvas.addEventListener("mousemove", (e) => {
    if (!currentAnalysis || !currentAnalysis.waveforms) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const leftMargin = 100;
    const rightMargin = 30;
    const topMargin = 32;
    const bottomMargin = 40;
    const plotW = canvas.width - leftMargin - rightMargin;
    const plotH = canvas.height - topMargin - bottomMargin;

    if (mouseX >= leftMargin && mouseX <= canvas.width - rightMargin && mouseY >= topMargin && mouseY <= canvas.height - bottomMargin) {
      const channelNames = currentAnalysis.waveforms.channel_names;
      const chH = plotH / channelNames.length;
      const chIdx = Math.floor((mouseY - topMargin) / chH);

      if (chIdx >= 0 && chIdx < channelNames.length) {
        const chName = channelNames[chIdx];
        const tFrac = (mouseX - leftMargin) / plotW;
        const timeSec = tFrac * 10.0;
        const rawTime = currentAnalysis.waveforms.time;
        const sampleIdx = Math.floor(tFrac * (rawTime.length - 1));
        const voltage = currentAnalysis.waveforms.channels[chName]?.[sampleIdx] || 0;

        tooltip.classList.remove("hidden");
        tooltip.style.left = `${e.clientX - rect.left + 15}px`;
        tooltip.style.top = `${e.clientY - rect.top + 10}px`;
        tooltip.innerHTML = `<strong>${chName}</strong>: ${voltage.toFixed(1)} uV &bull; 14:00:${(39 + timeSec).toFixed(2)}s`;
      }
    } else {
      tooltip.classList.add("hidden");
    }
  });

  canvas.addEventListener("mouseleave", () => {
    tooltip.classList.add("hidden");
  });
}

function openEditModal() {
  if (!currentAnalysis) return;
  const meta = currentAnalysis.metadata || {};
  const clinical = currentAnalysis.clinical_report || {};

  document.getElementById("editInstName").value = meta.institution || "Clinical Neurophysiology Laboratory";
  document.getElementById("editName").value = meta.patient_name || "";
  document.getElementById("editAge").value = meta.age || "";
  document.getElementById("editGender").value = meta.gender || "";
  document.getElementById("editDate").value = meta.exam_date || "";
  document.getElementById("editMRN").value = meta.mrn || "";
  document.getElementById("editRefDoctor").value = meta.referring_doctor || "Dr. Hira Asif";
  document.getElementById("editPatientState").value = meta.patient_state || "Sedated asleep";
  document.getElementById("editImpression").value = clinical.impression || "";
  document.getElementById("editConclusion").value = clinical.conclusion || "";

  document.getElementById("editModal")?.classList.remove("hidden");
}

async function saveAndRegeneratePDF() {
  if (!currentAnalysis) return;

  const updatedMeta = {
    ...currentAnalysis.metadata,
    institution: document.getElementById("editInstName").value,
    patient_name: document.getElementById("editName").value,
    age: document.getElementById("editAge").value,
    gender: document.getElementById("editGender").value,
    exam_date: document.getElementById("editDate").value,
    mrn: document.getElementById("editMRN").value,
    referring_doctor: document.getElementById("editRefDoctor").value,
    patient_state: document.getElementById("editPatientState").value,
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
    showToast("Report updated & 1-page clinical PDF generated.", "success");
  } catch (err) {
    showToast(`Regeneration Error: ${err.message}`, "error");
  }
}

function formatClinicalText(data) {
  const m = data.metadata || {};
  const c = data.clinical_report || {};
  return `${(m.institution || "CLINICAL NEUROPHYSIOLOGY LABORATORY").toUpperCase()}
ELECTROENCEPHALOGRAPHY (EEG) EXAMINATION REPORT
----------------------------------------------------------------------
Patient: ${m.patient_name || 'Unspecified'}  |  Age / Sex: ${m.age} / ${m.gender}
Exam Date: ${m.exam_date}  |  Recording ID: ${m.mrn}  |  Ref: ${m.referring_doctor}
Patient State: ${m.patient_state}
Montage: ${m.montage_type} (${m.channels_count} channels)
Calibration: ${m.sensitivity}, ${m.paper_speed}, ${m.notch_filter}

INTERPRETATION:
${(c.interpretation_paragraphs || []).map(p => "• " + p).join("\n")}

IMPRESSION:
${c.impression}

CONCLUSION:
${c.conclusion}

DIAGNOSTIC CLASSIFICATION:
${c.primary_diagnosis}
----------------------------------------------------------------------`;
}
