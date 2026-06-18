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

  function renderEmpty(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const card = el('div', 'card');
    card.style.cssText = 'text-align:center;padding:40px 18px;border-color:rgba(0,229,160,0.2);background:rgba(0,229,160,0.04);';
    const icon = el('div'); icon.style.cssText = 'font-size:36px;margin-bottom:10px;'; icon.textContent = '✅';
    const title = el('h3'); title.style.cssText = 'font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--accent-green);margin-bottom:8px;'; title.textContent = 'No vulnerabilities detected.';
    const desc = el('p'); desc.style.cssText = 'font-size:14px;color:var(--text-secondary);max-width:420px;margin:0 auto;line-height:1.65;'; desc.textContent = 'The live static analysis check did not return any findings for this snippet.';
    card.appendChild(icon); card.appendChild(title); card.appendChild(desc); container.appendChild(card);
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

  function setLoading(button, isLoading) {
    if (!button) return;
    button.disabled = isLoading;
    button.style.opacity = isLoading ? '0.75' : '';
    if (isLoading) {
      button.innerHTML = '<span class="spinner" style="margin-right:8px;"></span><span>Scanning…</span>';
    } else {
      button.innerHTML = originalButtonHtml;
    }
  }

  let originalButtonHtml = '';
  let lastDetection = null;
  let detectionPending = false;
  let isLanguageManuallySelected = false;

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

  function initScanner() {
    const codeInput = document.getElementById('code-input');
    const languageSelect = document.getElementById('language-select');
    const scanBtn = document.getElementById('scan-btn');
    const results = document.getElementById('scan-results');
    const charCount = document.getElementById('char-count');
    if (!codeInput || !scanBtn || !results) return;
    originalButtonHtml = scanBtn.innerHTML;

    // Track manual language selection
    if (languageSelect) {
      languageSelect.addEventListener('change', () => {
        isLanguageManuallySelected = true;
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

          if (detection && detection.detected_language) {
            // High confidence: auto-select and show success
            if (detection.confidence >= 80) {
              if (languageSelect) {
                languageSelect.value = detection.detected_language;
              }
              renderLanguageDetectionSuccess(results, detection.detected_language, detection.confidence);
            } else {
              // Low confidence: ask user to confirm
              renderLanguageDetectionLowConfidence(results, detection.detected_language, detection.confidence);
            }
          } else {
            // Failed to detect
            renderLanguageDetectionFailed(results);
          }
        }, 800);
      } else if (len === 0) {
        // Clear results when code is empty
        while (results.firstChild) results.removeChild(results.firstChild);
        lastDetection = null;
      }
    };

    codeInput.addEventListener('input', onCodeChange);
    if (charCount) onCodeChange();

    scanBtn.addEventListener('click', async () => {
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

      if (code.length > 50000) {
        renderError(results, 'This snippet is too large for the live scanner. Please shorten it.');
        return;
      }

      // Re-detect if needed and check if supported
      if (!lastDetection || !lastDetection.detected_language) {
        const detection = await detectLanguage(code);
        if (detection && !detection.supported) {
          renderDetectionError(results, detection.message || 'Language is not supported.');
          return;
        }
      } else if (!lastDetection.supported) {
        renderDetectionError(results, lastDetection.message || 'Language is not supported.');
        return;
      }

      setLoading(scanBtn, true);
      try {
        const startTime = performance.now();
        console.log('[SCAN] Request started at', new Date().toISOString());
        const response = await window.DevSecureAPI.postScan({ code, language, filename: null }, 60000);
        const endTime = performance.now();
        console.log('[SCAN] Request completed in', (endTime - startTime).toFixed(0), 'ms');
        const findings = Array.isArray(response.scan_results) ? response.scan_results : [];
        if (!findings.length) {
          renderEmpty(results);
        } else {
          while (results.firstChild) results.removeChild(results.firstChild);
          findings.forEach((item) => {
            const finding = normalizeFinding(item, language);
            results.appendChild(renderFinding(finding));
          });
        }
      } catch (error) {
        const message = error && error.code === 429
          ? 'Rate limit reached. Please wait a moment and try again.'
          : error && error.code === 504
            ? 'The backend scan timed out. Try a smaller snippet.'
            : error && error.message
              ? error.message
              : 'The scanner is unavailable right now. Please try again shortly.';
        renderError(results, message);
      } finally {
        setLoading(scanBtn, false);
        results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
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
