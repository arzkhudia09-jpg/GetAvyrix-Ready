/* ============================================================
   demo.js — Frontend shell for the real scanner MVP
   Keeps the existing layout and branding, but removes demo-only
   vulnerability logic in favor of backend-driven rendering.
   ============================================================ */

(function () {
  'use strict';

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function buildEmptyState(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const empty = el('div', 'empty-state');
    const icon = el('div', 'empty-state__icon');
    icon.textContent = '🔐';
    const title = el('div', 'empty-state__title');
    title.textContent = 'Ready for a live scan?';
    const desc = el('div', 'empty-state__desc');
    desc.textContent = 'Paste code, choose a language, and run the real backend scan pipeline.';
    empty.appendChild(icon);
    empty.appendChild(title);
    empty.appendChild(desc);
    container.appendChild(empty);
  }

  function initShell() {
    const codeInput = document.getElementById('code-input');
    const charCount = document.getElementById('char-count');
    const results = document.getElementById('scan-results');
    const clearBtn = document.getElementById('clear-btn');

    if (results) buildEmptyState(results);

    if (charCount && codeInput) {
      const updateCount = () => {
        const len = codeInput.value.length;
        charCount.textContent = `${len.toLocaleString()} chars`;
        charCount.style.color = len > 40000 ? 'var(--accent-red)' : 'var(--text-muted)';
      };
      codeInput.addEventListener('input', updateCount);
      updateCount();
    }

    document.querySelectorAll('[data-example]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.example;
        const examples = {
          sqli: '# Python example\nimport sqlite3\nquery = "SELECT * FROM users WHERE username = ' + '" + user\n',
          xss: 'function render(input) { document.getElementById("out").innerHTML = input; }',
          secret: 'const apiKey = "sk-prod-example";'
        };
        if (codeInput) {
          codeInput.value = examples[key] || '';
          codeInput.dispatchEvent(new Event('input'));
        }
      });
    });

    if (clearBtn && codeInput && results) {
      clearBtn.addEventListener('click', () => {
        codeInput.value = '';
        codeInput.dispatchEvent(new Event('input'));
        buildEmptyState(results);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', initShell);
})();


