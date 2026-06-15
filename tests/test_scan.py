from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_scan_endpoint_returns_results():
    payload = {
        'code': 'import subprocess\nsubprocess.call("echo hi")',
        'language': 'python',
    }
    response = client.post('/scan', json=payload)
    assert response.status_code == 200
    assert 'scan_results' in response.json()
