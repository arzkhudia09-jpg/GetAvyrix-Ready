(function () {
  'use strict';

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function severityLabel(severity) {
    return String(severity || 'medium').toUpperCase();
  }

  function severityTone(severity) {
    const value = String(severity || 'medium').toLowerCase();
    if (value === 'critical' || value === 'high') return 'badge--red';
    if (value === 'medium') return 'badge--amber';
    return 'badge--blue';
  }

  const SUPPORTED_LANGUAGES = ['python', 'javascript', 'typescript', 'go', 'java', 'php', 'ruby'];

  function severityRank(severity) {
    const value = String(severity || 'medium').toLowerCase();
    if (value === 'critical') return 5;
    if (value === 'high') return 4;
    if (value === 'medium') return 3;
    if (value === 'low') return 2;
    return 1;
  }

  function createResultCard(title, subtitle, accentClass, body) {
    const card = el('div', `result-card card ${accentClass}`);
    const header = el('div', 'result-card__header');
    const icon = el('div', 'result-card__icon');
    icon.textContent = title === 'Vulnerability' ? '🚨' : title === 'Fix Guidance' ? '🛠️' : title === 'Secure Example' ? '✅' : '🧠';
    icon.style.background = title === 'Vulnerability' ? 'var(--accent-red-dim)' : title === 'Fix Guidance' ? 'var(--accent-green-dim)' : 'var(--accent-blue-dim)';
    const titleWrap = el('div');
    const h = el('div', 'result-card__title');
    h.textContent = title;
    const s = el('div', 'result-card__subtitle');
    s.textContent = subtitle;
    titleWrap.appendChild(h); titleWrap.appendChild(s);
    header.appendChild(icon); header.appendChild(titleWrap);
    card.appendChild(header);
    const bodyWrap = el('div', 'result-card__body');
    body(bodyWrap);
    card.appendChild(bodyWrap);
    return card;
  }

  function renderFinding(finding) {
    const wrapper = el('div', 'scan-results');

    wrapper.appendChild(createResultCard('Vulnerability', 'Live backend finding', 'card--red', (body) => {
      const badge = el('span', `badge ${severityTone(finding.severity)} badge--dot`);
      badge.textContent = `${severityLabel(finding.severity)} • ${finding.name}`;
      body.appendChild(badge);
      const p = el('p');
      p.style.cssText = 'margin-top:12px;font-size:14px;color:var(--text-secondary);line-height:1.7;';
      p.textContent = finding.whatHappened || 'No explanation returned by the backend.';
      body.appendChild(p);
      const meta = el('div');
      meta.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-muted);';
      meta.textContent = `Confidence: ${String(finding.confidence || 'high').toUpperCase()} • Language: ${finding.language || 'Unknown'}`;
      body.appendChild(meta);
    }));

    wrapper.appendChild(createResultCard('What this means', 'Attack scenario and impact', 'card--blue', (body) => {
      const list = el('ul');
      list.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:10px;';
      [finding.whatHappened, finding.howAttackExploits, finding.whyMatters].forEach((item) => {
        const li = el('li');
        li.style.cssText = 'display:flex;gap:10px;font-size:14px;color:var(--text-secondary);line-height:1.65;';
        const num = el('span');
        num.style.cssText = 'flex-shrink:0;width:20px;height:20px;border-radius:50%;background:var(--accent-blue-dim);border:1px solid rgba(77,158,255,0.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;color:var(--accent-blue);';
        num.textContent = '•';
        const text = el('span');
        text.textContent = item;
        li.appendChild(num); li.appendChild(text); list.appendChild(li);
      });
      body.appendChild(list);
    }));

    wrapper.appendChild(createResultCard('Fix Guidance', 'Remediation steps from the backend', 'card--green', (body) => {
      const ol = el('ol', 'steps-list');
      (finding.howToFix || []).forEach((step) => {
        const li = el('li');
        const text = el('span');
        text.textContent = step;
        li.appendChild(text); ol.appendChild(li);
      });
      body.appendChild(ol);
    }));

    wrapper.appendChild(createResultCard('Secure Example', 'Safe guidance and example snippet', 'card--green', (body) => {
      const block = el('div', 'code-block');
      block.style.cssText = 'border:none;border-radius:0;margin:0;';
      const header = el('div', 'code-block__header');
      const dots = el('div', 'code-block__dots');
      ['dot1', 'dot2', 'dot3'].forEach(() => dots.appendChild(el('div', 'code-block__dot')));
      const lang = el('span', 'code-block__lang');
      lang.textContent = 'secure example';
      const copy = el('button', 'copy-btn');
      copy.textContent = '⎘ Copy';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(finding.secureExample || '');
          copy.textContent = '✓ Copied!';
          setTimeout(() => { copy.textContent = '⎘ Copy'; }, 1800);
        } catch (err) {
          copy.textContent = 'Copy failed';
        }
      });
      header.appendChild(dots); header.appendChild(lang); header.appendChild(copy);
      block.appendChild(header);
      const pre = el('div', 'code-block__body');
      pre.textContent = finding.secureExample || 'No secure example returned.';
      block.appendChild(pre);
      body.appendChild(block);
    }));

    return wrapper;
  }

  function renderFindingNavigator(findings, container, language) {
    if (!container) return;
    const sortedFindings = [...findings].sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
    if (!sortedFindings.length) {
      renderEmpty(container);
      return;
    }

    let currentIndex = 0;
    const cardWrap = el('div', 'result-navigator');
    const content = el('div', 'result-navigator__content');

    const createNav = () => {
      const nav = el('div', 'result-navigator__nav');
      const prevBtn = el('button', 'btn btn--ghost');
      prevBtn.textContent = '← Previous';
      prevBtn.type = 'button';
      const nextBtn = el('button', 'btn btn--ghost');
      nextBtn.textContent = 'Next →';
      nextBtn.type = 'button';
      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
      return { nav, prevBtn, nextBtn };
    };

    const topNav = createNav();
    const bottomNav = createNav();

    const renderCurrent = () => {
      while (content.firstChild) content.removeChild(content.firstChild);
      const item = sortedFindings[currentIndex];
      const normalized = normalizeFinding(item, language);
      const card = renderFinding(normalized);
      card.classList.add('result-navigator__card');
      content.appendChild(card);

      [topNav, bottomNav].forEach(({ prevBtn, nextBtn }) => {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === sortedFindings.length - 1;
        prevBtn.style.opacity = prevBtn.disabled ? '0.5' : '';
        nextBtn.style.opacity = nextBtn.disabled ? '0.5' : '';
      });
    };

    [topNav, bottomNav].forEach(({ prevBtn, nextBtn }) => {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex -= 1;
          renderCurrent();
        }
      });
      nextBtn.addEventListener('click', () => {
        if (currentIndex < sortedFindings.length - 1) {
          currentIndex += 1;
          renderCurrent();
        }
      });
    });

    if (sortedFindings.length > 1) {
      cardWrap.appendChild(topNav.nav);
    }
    cardWrap.appendChild(content);
    if (sortedFindings.length > 1) {
      cardWrap.appendChild(bottomNav.nav);
    }

    container.appendChild(cardWrap);
    renderCurrent();
  }

  function renderEmpty(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const card = el('div', 'card');
    card.style.cssText = 'text-align:center;padding:40px 18px;border-color:rgba(0,229,160,0.2);background:rgba(0,229,160,0.04);';
    const icon = el('div'); icon.style.cssText = 'font-size:36px;margin-bottom:10px;'; icon.textContent = '✅';
    const title = el('h3'); title.style.cssText = 'font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--accent-green);margin-bottom:8px;'; title.textContent = 'No vulnerabilities detected.';
    const desc = el('p'); desc.style.cssText = 'font-size:14px;color:var(--text-secondary);max-width:420px;margin:0 auto;line-height:1.65;'; desc.textContent = 'The live static analysis check did not return any findings for this snippet.';
    card.appendChild(icon); card.appendChild(title); card.appendChild(desc); container.appendChild(card);
  }

  function renderScanInProgress(container, message) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const card = el('div', 'card scan-progress-card');
    card.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 20px;text-align:center;';
    const spinner = el('div', 'spinner');
    spinner.style.cssText = 'width:28px;height:28px;margin-bottom:12px;';
    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text-primary);margin:0 0 8px;';
    title.textContent = 'Scanning in progress...';
    const desc = el('p');
    desc.style.cssText = 'font-size:14px;color:var(--text-secondary);margin:0;';
    desc.textContent = message || 'The scanner is reviewing your snippet now.';
    card.appendChild(spinner); card.appendChild(title); card.appendChild(desc); container.appendChild(card);
  }

  function renderError(container, message) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const alert = el('div', 'alert alert--error');
    alert.textContent = message;
    container.appendChild(alert);
  }

  function renderDetectionError(container, message) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const card = el('div', 'card');
    card.style.cssText = 'padding:20px;border-color:rgba(255,0,0,0.2);background:rgba(255,0,0,0.04);';

    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--accent-red);margin-bottom:12px;';
    title.textContent = '❌ Unsupported Language';
    card.appendChild(title);

    const msg = el('p');
    msg.style.cssText = 'font-size:14px;color:var(--text-secondary);margin:0;';
    msg.textContent = message;
    card.appendChild(msg);

    container.appendChild(card);
  }

  function createModal(message, options = {}) {
    if (document.getElementById('language-selection-modal')) {
      document.getElementById('language-selection-modal').remove();
    }

    const overlay = el('div', 'language-modal-overlay');
    overlay.id = 'language-selection-modal';
    const dialog = el('div', 'language-modal');
    const title = el('h3', 'language-modal__title');
    title.textContent = options.title || 'Select the language of the pasted code.';
    const body = el('p', 'language-modal__body');
    body.textContent = message;

    const buttonRow = el('div', 'language-modal__actions');
    const cancelButton = el('button', 'btn btn--ghost');
    cancelButton.textContent = options.cancelLabel || 'Cancel';
    cancelButton.type = 'button';
    cancelButton.addEventListener('click', () => overlay.remove());

    const confirmButton = el('button', 'btn btn--primary');
    confirmButton.textContent = options.confirmLabel || 'Continue';
    confirmButton.type = 'button';

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(confirmButton);

    dialog.appendChild(title);
    dialog.appendChild(body);

    if (options.showSelect) {
      const select = el('select', 'form-select');
      select.setAttribute('aria-label', 'Select programming language');
      SUPPORTED_LANGUAGES.forEach((language) => {
        const option = document.createElement('option');
        option.value = language;
        option.textContent = language.charAt(0).toUpperCase() + language.slice(1);
        select.appendChild(option);
      });
      if (options.defaultValue) {
        select.value = options.defaultValue;
      }
      dialog.appendChild(select);
    }

    dialog.appendChild(buttonRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    return { overlay, confirmButton, cancelButton, select: dialog.querySelector('select') };
  }

  function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.style.opacity = isLoading ? '0.75' : '';
    if (isLoading) {
      button.innerHTML = '<span class="spinner" style="margin-right:8px;"></span><span>Scanning…</span>';
    } else {
      syncScannerButtonState();
    }
  }

  function formatRelativeTime(timestamp) {
    if (!timestamp) return 'Not checked yet';
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} minutes ago`;
    return `${Math.floor(diffSec / 3600)} hours ago`;
  }

  function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = `scanner-status-badge ${status === 'online' ? 'scanner-status-badge--online' : status === 'waking' ? 'scanner-status-badge--waking' : 'scanner-status-badge--offline'}`;
    badge.textContent = status === 'online' ? '🟢 Scanner Online' : status === 'waking' ? '🟡 Scanner Waking Up' : '🔴 Scanner Offline';
    return badge;
  }

  function createSummaryCard(title, value, detail, modifier) {
    const card = el('div', `scanner-summary-card${modifier ? ` scanner-summary-card--${modifier}` : ''}`);
    const titleEl = el('div', 'scanner-summary-card__title');
    titleEl.textContent = title;
    const valueEl = el('div', 'scanner-summary-card__value');
    valueEl.textContent = value;
    const detailEl = el('div', 'scanner-summary-card__detail');
    detailEl.textContent = detail;
    card.appendChild(titleEl);
    card.appendChild(valueEl);
    card.appendChild(detailEl);
    return card;
  }

  function moveMvpStatusBlock() {
    const block = document.getElementById('mvp-status-block');
    const host = document.getElementById('mvp-status-host');
    if (block && host && block.parentNode !== host) {
      host.appendChild(block);
    }
  }

  function setStatusPanelState(state) {
    const summary = document.getElementById('scanner-summary-row');
    if (!summary) return;

    const status = state.status || 'offline';
    const queueCount = state.queueCount || 0;
    const lastCheckedLabel = state.lastCheckedAt ? `Last checked: ${formatRelativeTime(state.lastCheckedAt)}` : 'Last checked: not checked yet';
    const lastOnlineLabel = state.lastOnlineAt ? `Last online: ${formatRelativeTime(state.lastOnlineAt)}` : 'Scanner has not connected yet.';
    const languageValue = state.currentLanguage || 'Pending';
    const findingValue = state.findingCount > 0 ? `${state.findingCount}` : '—';
    const findingDetail = state.findingCount > 0 ? `${state.findingCount} finding${state.findingCount === 1 ? '' : 's'} ready` : 'No findings yet';

    summary.innerHTML = '';

    const panel = document.createElement('div');
    panel.id = 'scanner-status-panel';
    panel.className = 'scanner-status-panel';
    const row = document.createElement('div');
    row.className = 'scanner-status-panel__row';
    row.appendChild(createStatusBadge(status));
    if (status === 'online') {
      const time = document.createElement('div');
      time.className = 'scanner-status-time';
      time.textContent = lastCheckedLabel;
      row.appendChild(time);
    } else if (status === 'waking') {
      const time = document.createElement('div');
      time.className = 'scanner-status-time';
      time.textContent = 'Estimated wake-up: 20–60 seconds';
      row.appendChild(time);
    } else {
      const time = document.createElement('div');
      time.className = 'scanner-status-time';
      time.textContent = lastOnlineLabel;
      row.appendChild(time);
    }
    panel.appendChild(row);

    const message = document.createElement('div');
    message.className = 'scanner-status-message';
    message.textContent = status === 'online'
      ? 'Scanner ready.'
      : status === 'waking'
        ? 'Scanner is waking up. First scan after inactivity may take longer.'
        : 'Scanner is unavailable right now. Please try again later.';
    panel.appendChild(message);

    if (status === 'waking') {
      const progress = document.createElement('div');
      progress.className = 'scanner-status-progress';
      progress.textContent = state.progressMessage || 'Initializing scanner...';
      panel.appendChild(progress);
    }

    if (queueCount > 0) {
      const queue = document.createElement('div');
      queue.className = 'scanner-status-queue';
      queue.innerHTML = `<strong>${queueCount} scan queued</strong>Your scan will start automatically when the scanner becomes available.`;
      panel.appendChild(queue);
    }

    const cards = document.createElement('div');
    cards.className = 'scanner-summary-row__cards';
    cards.appendChild(createSummaryCard('Status', status === 'online' ? 'Ready' : status === 'waking' ? 'Waking' : 'Offline', status === 'online' ? 'Backend is responding' : status === 'waking' ? 'Restoring service' : 'Awaiting backend', 'status'));
    cards.appendChild(createSummaryCard('Language', languageValue, 'Detected or selected for scanning', 'language'));
    cards.appendChild(createSummaryCard('Findings', findingValue, findingDetail, 'findings'));

    summary.appendChild(panel);
    summary.appendChild(cards);
  }

  let originalButtonHtml = '';
  let lastDetection = null;
  let detectionPending = false;
  let isLanguageManuallySelected = false;
  let isWakeInProgress = false;
  let wakePollTimer = null;
  let wakeStartedAt = null;
  let scanButton = null;
  let resultsContainer = null;
  let wakeAttemptCount = 0;
  let scannerState = {
    status: 'offline',
    lastCheckedAt: null,
    lastOnlineAt: null,
    queueCount: 0,
    progressMessage: 'Initializing scanner...',
    currentLanguage: 'Pending',
    findingCount: 0
  };
  let pendingScanPayload = null;
  let isScanInFlight = false;

  function syncScannerButtonState() {
    if (!scanButton) return;
    if (scannerState.status === 'waking') {
      scanButton.disabled = true;
      scanButton.style.opacity = '0.75';
      scanButton.innerHTML = '<span class="spinner" style="margin-right:8px;"></span><span>Waking…</span>';
    } else if (scannerState.status === 'online') {
      scanButton.disabled = false;
      scanButton.style.opacity = '';
      scanButton.innerHTML = originalButtonHtml;
    } else {
      scanButton.disabled = false;
      scanButton.style.opacity = '';
      scanButton.innerHTML = '<span>Wake Scanner</span>';
    }
  }

  async function checkBackendHealth() {
    try {
      const response = await window.DevSecureAPI.getHealth(8000);
      scannerState.lastCheckedAt = Date.now();
      scannerState.status = 'online';
      scannerState.progressMessage = 'Scanner ready.';
      if (!scannerState.lastOnlineAt) scannerState.lastOnlineAt = Date.now();
      setStatusPanelState(scannerState);
      syncScannerButtonState();
      return { ok: true, response };
    } catch (error) {
      scannerState.lastCheckedAt = Date.now();
      if (error && error.code === 504) {
        scannerState.status = 'waking';
        scannerState.progressMessage = 'Performing health check...';
      } else {
        scannerState.status = 'offline';
        scannerState.progressMessage = 'Scanner is unavailable right now.';
      }
      setStatusPanelState(scannerState);
      syncScannerButtonState();
      return { ok: false, error };
    }
  }

  function stopWakePolling() {
    if (wakePollTimer) {
      clearTimeout(wakePollTimer);
      wakePollTimer = null;
    }
  }

  async function performWakeUp(button) {
    if (isWakeInProgress || isScanInFlight) return;
    isWakeInProgress = true;
    wakeAttemptCount = 0;
    scannerState.status = 'waking';
    scannerState.progressMessage = 'Initializing scanner...';
    setStatusPanelState(scannerState);
    syncScannerButtonState();

    const pollForWake = async () => {
      const result = await checkBackendHealth();
      if (result.ok) {
        stopWakePolling();
        isWakeInProgress = false;
        scannerState.status = 'online';
        scannerState.progressMessage = 'Scanner is ready. Starting your scan now...';
        setStatusPanelState(scannerState);
        syncScannerButtonState();
        if (pendingScanPayload) {
          const payload = pendingScanPayload;
          pendingScanPayload = null;
          scannerState.queueCount = 0;
          setStatusPanelState(scannerState);
          await runScanRequest(payload, button);
        }
        return;
      }

      wakeAttemptCount += 1;
      const nextDelay = Math.min(10 + (wakeAttemptCount * 2), 90);
      const delay = wakeAttemptCount <= 3 ? [2, 4, 8, 10][wakeAttemptCount - 1] || 10 : Math.min(nextDelay, 10);
      const effectiveDelay = Math.min(delay, 90);
      scannerState.progressMessage = wakeAttemptCount === 1
        ? 'Connecting to backend...'
        : wakeAttemptCount === 2
          ? 'Waiting for scanner availability...'
          : 'Performing health check...';
      setStatusPanelState(scannerState);
      if (wakeAttemptCount >= 8) {
        stopWakePolling();
        isWakeInProgress = false;
        scannerState.status = 'offline';
        scannerState.progressMessage = 'Scanner is unavailable right now. Please try again later.';
        setStatusPanelState(scannerState);
        syncScannerButtonState();
        return;
      }
      wakePollTimer = setTimeout(() => {
        pollForWake();
      }, effectiveDelay * 1000);
    };

    await pollForWake();
  }

  async function runScanRequest(payload, button) {
    if (isScanInFlight) return;
    isScanInFlight = true;
    const targetButton = button || scanButton;
    if (targetButton) setLoading(targetButton, true);
    const resultContainer = resultsContainer || document.getElementById('scan-results');
    try {
      const startTime = performance.now();
      console.log('[SCAN] Request started at', new Date().toISOString());
      const response = await window.DevSecureAPI.postScan(payload, 60000);
      const endTime = performance.now();
      console.log('[SCAN] Request completed in', (endTime - startTime).toFixed(0), 'ms');
      const findings = Array.isArray(response.scan_results) ? response.scan_results : [];
      if (!resultContainer) return;
      if (!findings.length) {
        renderEmpty(resultContainer);
      } else {
        while (resultContainer.firstChild) resultContainer.removeChild(resultContainer.firstChild);
        renderFindingNavigator(findings, resultContainer, payload.language);
      }
      scannerState.lastOnlineAt = Date.now();
      scannerState.status = 'online';
      scannerState.progressMessage = 'Scanner ready.';
      scannerState.findingCount = findings.length;
      setStatusPanelState(scannerState);
      moveMvpStatusBlock();
    } catch (error) {
      const message = error && error.code === 429
        ? 'Rate limit reached. Please wait a moment and try again.'
        : error && error.code === 504
          ? 'The backend scan timed out. Try a smaller snippet.'
          : error && error.message
            ? error.message
            : 'The scanner is unavailable right now. Please try again shortly.';
      scannerState.status = 'offline';
      scannerState.progressMessage = 'Scanner is unavailable right now.';
      scannerState.findingCount = 0;
      setStatusPanelState(scannerState);
      if (resultContainer) renderError(resultContainer, message);
    } finally {
      isScanInFlight = false;
      if (targetButton) setLoading(targetButton, false);
      if (resultContainer) resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderLanguageDetectionSuccess(container, detected, confidence) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const card = el('div', 'card');
    card.style.cssText = 'padding:20px;border-color:rgba(0,229,160,0.2);background:rgba(0,229,160,0.04);';

    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--accent-green);margin-bottom:12px;';
    title.textContent = '✅ Language Detected';
    card.appendChild(title);

    const detectionInfo = el('div');
    detectionInfo.style.cssText = 'display:flex;flex-direction:column;gap:8px;font-size:14px;color:var(--text-secondary);';

    const detectedLine = el('div');
    detectedLine.innerHTML = `<strong>${detected}</strong> detected with <span class="badge badge--green" style="margin-left:8px;">${confidence}% confidence</span>`;
    detectionInfo.appendChild(detectedLine);

    const readyMsg = el('div');
    readyMsg.style.cssText = 'margin-top:8px;color:var(--accent-green);';
    readyMsg.textContent = 'Ready to scan!';
    detectionInfo.appendChild(readyMsg);

    card.appendChild(detectionInfo);
    container.appendChild(card);
  }

  function renderLanguageDetectionLowConfidence(container, detected, confidence) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const card = el('div', 'card');
    card.style.cssText = 'padding:20px;border-color:rgba(255,165,0,0.2);background:rgba(255,165,0,0.04);';

    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:12px;';
    title.textContent = '⚠️ Uncertain Detection';
    card.appendChild(title);

    const detectionInfo = el('div');
    detectionInfo.style.cssText = 'display:flex;flex-direction:column;gap:10px;font-size:14px;color:var(--text-secondary);';

    const detectedLine = el('div');
    detectedLine.innerHTML = `Detected: <strong>${detected || 'Unknown'}</strong> (${confidence}% confidence)`;
    detectionInfo.appendChild(detectedLine);

    const warning = el('div');
    warning.style.cssText = 'margin-top:8px;padding:10px;border-left:3px solid var(--accent-amber);background:rgba(255,165,0,0.05);font-size:13px;';
    warning.innerHTML = '👆 Please confirm or select your programming language above.';
    detectionInfo.appendChild(warning);

    card.appendChild(detectionInfo);
    container.appendChild(card);
  }

  function renderLanguageDetectionFailed(container) {
    while (container.firstChild) container.removeChild(container.firstChild);

    const card = el('div', 'card');
    card.style.cssText = 'padding:20px;border-color:rgba(255,165,0,0.2);background:rgba(255,165,0,0.04);';

    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:12px;';
    title.textContent = '❓ Language Not Detected';
    card.appendChild(title);

    const detectionInfo = el('div');
    detectionInfo.style.cssText = 'display:flex;flex-direction:column;gap:10px;font-size:14px;color:var(--text-secondary);';

    const msg = el('div');
    msg.innerHTML = 'Could not automatically detect the language. Please select your programming language above.';
    detectionInfo.appendChild(msg);

    card.appendChild(detectionInfo);
    container.appendChild(card);
  }

  async function detectLanguage(code) {
    if (!code || code.trim().length === 0) {
      lastDetection = null;
      return null;
    }

    detectionPending = true;
    try {
      const result = await window.DevSecureAPI.postDetect({ code, language: 'python', filename: null });
      lastDetection = result;
      return result;
    } catch (error) {
      console.error('[DETECTION] Error:', error);
      lastDetection = null;
      return null;
    } finally {
      detectionPending = false;
    }
  }

  async function startScanFlow(codeInput, languageSelect, results, scanBtn) {
    const code = codeInput.value.trim();
    const language = languageSelect ? languageSelect.value : 'python';

    if (!code) {
      renderError(results, 'Please paste code before scanning.');
      return;
    }

    scannerState.currentLanguage = language || 'Pending';
    scannerState.findingCount = 0;
    setStatusPanelState(scannerState);

    if (!language) {
      renderError(results, 'Please select a programming language.');
      return;
    }

    if (code.length > 50000) {
      renderError(results, 'This snippet is too large for the live scanner. Please shorten it.');
      return;
    }

    renderScanInProgress(results, 'Preparing language selection and scan request...');

    const detection = await detectLanguage(code);
    if (!detection) {
      const modal = createModal('Select the language of the pasted code.', {
        title: 'Select the language of the pasted code.',
        showSelect: true,
        defaultValue: language,
        confirmLabel: 'Start scan',
      });
      modal.confirmButton.addEventListener('click', async () => {
        const chosenLanguage = modal.select ? modal.select.value : language;
        if (!chosenLanguage) {
          renderError(results, 'Please select a programming language.');
          modal.overlay.remove();
          return;
        }
        modal.overlay.remove();
        const payload = { code, language: chosenLanguage, filename: null };
        await runScanRequest(payload, scanBtn);
      });
      return;
    }

    if (!detection.supported) {
      const message = detection.message || 'This language is not supported yet. Support is coming soon.';
      renderError(results, message);
      if (detection.detected_language) {
        const modal = createModal('This language is not supported yet. Support is coming soon.', { title: 'Language not supported yet', showSelect: false, cancelLabel: 'Close' });
        modal.confirmButton.textContent = 'Close';
        modal.confirmButton.addEventListener('click', () => modal.overlay.remove());
      }
      return;
    }

    const selectedLanguage = language || detection.detected_language;
    scannerState.currentLanguage = selectedLanguage;
    setStatusPanelState(scannerState);
    if (selectedLanguage && detection.detected_language && selectedLanguage !== detection.detected_language && detection.confidence >= 80) {
      const modal = createModal('The selected language does not appear to match the pasted code. Please choose the correct language.', {
        title: 'Language mismatch',
        showSelect: true,
        defaultValue: detection.detected_language,
        confirmLabel: 'Retry scan',
      });
      modal.confirmButton.addEventListener('click', async () => {
        const correctedLanguage = modal.select ? modal.select.value : detection.detected_language;
        modal.overlay.remove();
        const payload = { code, language: correctedLanguage, filename: null };
        await runScanRequest(payload, scanBtn);
      });
      return;
    }

    const payload = { code, language: selectedLanguage, filename: null };
    await runScanRequest(payload, scanBtn);
  }

  function initScanner() {
    const codeInput = document.getElementById('code-input');
    const languageSelect = document.getElementById('language-select');
    const scanBtn = document.getElementById('scan-btn');
    const results = document.getElementById('scan-results');
    const charCount = document.getElementById('char-count');
    if (!codeInput || !scanBtn || !results) return;
    scanButton = scanBtn;
    resultsContainer = results;
    originalButtonHtml = scanBtn.innerHTML;
    syncScannerButtonState();
    checkBackendHealth();

    scanBtn.addEventListener('click', async () => {
      if (scannerState.status === 'waking' || isWakeInProgress) {
        return;
      }
      if (scannerState.status !== 'online') {
        if (!pendingScanPayload) {
          const code = codeInput.value.trim();
          const language = languageSelect ? languageSelect.value : 'python';
          if (!code) {
            renderError(results, 'Please paste code before scanning.');
            return;
          }
          if (!language) {
            renderError(results, 'Please select a programming language.');
            return;
          }
          pendingScanPayload = { code, language, filename: null };
          scannerState.queueCount = 1;
          setStatusPanelState(scannerState);
          renderError(results, 'Scanner is waking up. Your scan will start automatically.');
          await performWakeUp(scanBtn);
        }
        return;
      }

      await startScanFlow(codeInput, languageSelect, results, scanBtn);
    });

    // Track manual language selection
    if (languageSelect) {
      languageSelect.addEventListener('change', () => {
        isLanguageManuallySelected = true;
        scannerState.currentLanguage = languageSelect.value || 'Pending';
        setStatusPanelState(scannerState);
      });
    }

    // Auto-detect language as user types
    let detectionTimeout;
    const onCodeChange = async () => {
      clearTimeout(detectionTimeout);
      const len = codeInput.value.length;
      charCount.textContent = `${len.toLocaleString()} chars`;
      charCount.style.color = len > 40000 ? 'var(--accent-red)' : 'var(--text-muted)';

      if (len > 0 && len <= 40000) {
        detectionTimeout = setTimeout(async () => {
          const detection = await detectLanguage(codeInput.value);
          if (detection && detection.detected_language && detection.supported && detection.confidence >= 80) {
            if (languageSelect) {
              languageSelect.value = detection.detected_language;
            }
            scannerState.currentLanguage = detection.detected_language;
            setStatusPanelState(scannerState);
          } else if (detection && detection.detected_language && !detection.supported) {
            const modal = createModal('This language is not supported yet. Support is coming soon.', {
              title: 'Language not supported yet',
              showSelect: false,
              cancelLabel: 'Close',
            });
            modal.confirmButton.textContent = 'Close';
            modal.confirmButton.addEventListener('click', () => modal.overlay.remove());
          }
        }, 800);
      } else if (len === 0) {
        while (results.firstChild) results.removeChild(results.firstChild);
        lastDetection = null;
      }
    };

    codeInput.addEventListener('input', onCodeChange);
    if (charCount) onCodeChange();
  }

  function normalizeFinding(item, language) {
    return {
      name: item.vulnerability || 'Potential issue',
      severity: item.severity || 'medium',
      confidence: item.confidence || 'high',
      whatHappened: item.simple_explanation || 'The backend returned no explanation for this finding.',
      howAttackExploits: item.attack_scenario || 'Attack scenario guidance is unavailable in this response.',
      whyMatters: item.learning_tip || 'Review the fix guidance before deploying this snippet.',
      howToFix: Array.isArray(item.fix_steps) && item.fix_steps.length ? item.fix_steps : ['Validate input', 'Use the safest available APIs', 'Store secrets outside the source tree.'],
      secureExample: item.secure_code_example || '# Secure example not returned by the backend.',
      language,
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    initScanner();
  });
})();
