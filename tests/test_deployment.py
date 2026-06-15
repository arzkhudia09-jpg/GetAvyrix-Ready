from pathlib import Path

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.scanners.semgrep_engine import SemgrepEngine

client = TestClient(app)


def test_health_endpoint_for_deployment():
    response = client.get('/health')

    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert 'environment' in response.json()


def test_scan_endpoint_returns_scan_results_shape():
    payload = {
        'code': 'import subprocess\nsubprocess.call("echo hi")',
        'language': 'python',
    }

    response = client.post('/scan', json=payload)

    assert response.status_code == 200
    assert 'scan_results' in response.json()
    assert isinstance(response.json()['scan_results'], list)


def test_frontend_api_url_is_configurable_for_deployment():
    api_js = Path('frontend/js/services/api.js').read_text(encoding='utf-8')
    demo_html = Path('frontend/demo.html').read_text(encoding='utf-8')

    assert 'window.__DEVSECURE_API_BASE__' in api_js
    assert 'meta[name="devsecurecoach-api-url"]' in api_js
    assert 'meta name="devsecurecoach-api-url" content=""' in demo_html


def test_semgrep_engine_rejects_unsupported_languages():
    engine = SemgrepEngine(timeout=5)

    try:
        engine.run('print("hi")', 'cobol')
    except ValueError as exc:
        assert 'Unsupported language' in str(exc)
    else:
        raise AssertionError('Expected unsupported language validation to fail')
