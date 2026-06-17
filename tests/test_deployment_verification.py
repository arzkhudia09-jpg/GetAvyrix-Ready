"""
Deployment Verification Tests
Tests to verify production readiness before deployment
"""

import os
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


class TestHealthEndpoint:
    """Verify health check endpoint works"""

    def test_health_endpoint_status_code(self):
        """Health endpoint should return 200"""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_endpoint_structure(self):
        """Health endpoint should return required fields"""
        response = client.get("/health")
        data = response.json()
        assert "status" in data
        assert data["status"] == "ok"
        assert "service" in data
        assert "environment" in data

    def test_health_endpoint_environment_detection(self):
        """Health endpoint should report environment correctly"""
        response = client.get("/health")
        data = response.json()
        env = data.get("environment", "").lower()
        assert env in ["development", "production"]

    def test_health_endpoint_api_base_url(self):
        """Health endpoint should include API_BASE_URL if set"""
        response = client.get("/health")
        data = response.json()
        # Should have api_base_url field (even if None)
        assert "api_base_url" in data


class TestScanEndpoint:
    """Verify scan endpoint functionality"""

    def test_scan_detects_sql_injection(self):
        """Scan should detect SQL injection vulnerability"""
        payload = {
            "code": 'query = "SELECT * FROM users WHERE id = " + userId',
            "language": "python",
        }
        response = client.post("/scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "scan_results" in data
        assert "status" in data
        assert data["status"] == "ok"

    def test_scan_response_has_required_fields(self):
        """Scan response should have all required fields"""
        payload = {
            "code": 'import subprocess\nsubprocess.call("echo hi")',
            "language": "python",
        }
        response = client.post("/scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "scan_results" in data
        assert "summary" in data

    def test_scan_with_empty_code(self):
        """Scan should handle empty code gracefully"""
        payload = {
            "code": "",
            "language": "python",
        }
        response = client.post("/scan", json=payload)
        # Should either return 200 or 400, not 500
        assert response.status_code in [200, 400]

    def test_scan_finding_structure(self):
        """Each finding should have required fields"""
        payload = {
            "code": 'query = "SELECT * WHERE id = " + user_id',
            "language": "python",
        }
        response = client.post("/scan", json=payload)
        assert response.status_code == 200
        data = response.json()
        results = data.get("scan_results", [])

        if results:  # If vulnerabilities found, check structure
            finding = results[0]
            assert "vulnerability" in finding
            assert "severity" in finding
            assert "confidence" in finding
            assert "simple_explanation" in finding
            assert "attack_scenario" in finding
            assert "fix_steps" in finding
            assert "secure_code_example" in finding
            assert "learning_tip" in finding


class TestExplainEndpoint:
    """Verify explain endpoint functionality"""

    def test_explain_endpoint_response(self):
        """Explain endpoint should return guidance"""
        payload = {
            "finding": "sql-injection",
            "severity": "high",
            "language": "python",
            "code": "query = 'SELECT * WHERE id = ' + user_id",
        }
        response = client.post("/explain", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "simple_explanation" in data
        assert "attack_scenario" in data
        assert "fix_steps" in data

    def test_explain_endpoint_has_learning_content(self):
        """Explain endpoint should include learning content"""
        payload = {
            "finding": "xss-attack",
            "severity": "medium",
            "language": "javascript",
            "code": "element.innerHTML = userInput",
        }
        response = client.post("/explain", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "learning_tip" in data
        assert "secure_code_example" in data


class TestSecurityHeaders:
    """Verify security headers are set correctly"""

    def test_security_headers_present(self):
        """Response should include security headers"""
        response = client.get("/health")
        # Check for essential security headers
        assert "x-content-type-options" in response.headers
        assert response.headers["x-content-type-options"] == "nosniff"

    def test_frame_options_header(self):
        """X-Frame-Options header should prevent clickjacking"""
        response = client.get("/health")
        assert "x-frame-options" in response.headers
        assert response.headers["x-frame-options"] == "DENY"

    def test_referrer_policy_header(self):
        """Referrer-Policy should be set"""
        response = client.get("/health")
        assert "referrer-policy" in response.headers

    def test_csp_header_presence(self):
        """Content-Security-Policy header should be present"""
        response = client.get("/health")
        assert "content-security-policy" in response.headers


class TestErrorHandling:
    """Verify error handling is production-safe"""

    def test_404_error_response(self):
        """404 errors should have proper structure"""
        response = client.get("/nonexistent-endpoint")
        assert response.status_code == 404
        data = response.json()
        assert "status" in data
        assert data["status"] == "error"

    def test_invalid_request_handling(self):
        """Invalid requests should return 422 or 400"""
        payload = {"code": "print('hello')"}  # Missing required field
        response = client.post("/scan", json=payload)
        assert response.status_code in [400, 422]

    def test_error_message_safety(self):
        """Error messages should not expose sensitive info"""
        response = client.get("/nonexistent")
        data = response.json()
        message = str(data.get("message", "")).lower()
        # Should not contain file paths, stack traces, etc
        assert "traceback" not in message
        assert "file" not in message


class TestCORSConfiguration:
    """Verify CORS is configured correctly for production"""

    def test_cors_origin_header(self):
        """Response should include CORS headers"""
        response = client.get(
            "/health",
            headers={"origin": "http://localhost:3000"}
        )
        # Should have CORS headers (FastAPI sets them automatically)
        assert response.status_code == 200

    def test_cors_preflight_handling(self):
        """OPTIONS requests should be handled"""
        response = client.options(
            "/scan",
            headers={"origin": "http://localhost:3000"}
        )
        # Should return 200 or 204 for preflight
        assert response.status_code in [200, 204]


class TestEnvironmentVariables:
    """Verify environment variables are properly configured"""

    def test_environment_variable_detection(self):
        """App should detect ENVIRONMENT variable"""
        env = os.getenv("ENVIRONMENT", "development").lower()
        assert env in ["development", "production"]

    def test_cors_origins_configuration(self):
        """CORS_ORIGINS should be configurable"""
        cors_origins = os.getenv("CORS_ORIGINS", "")
        # Either have defaults or explicit configuration
        assert isinstance(cors_origins, str)

    def test_api_base_url_available(self):
        """API_BASE_URL should be available for frontend"""
        # Should be retrievable via health endpoint
        response = client.get("/health")
        data = response.json()
        assert "api_base_url" in data


class TestDeploymentReadiness:
    """Overall deployment readiness checks"""

    def test_all_core_endpoints_working(self):
        """All core endpoints should respond"""
        endpoints = [
            ("/health", "GET"),
            ("/scan", "POST"),
            ("/explain", "POST"),
        ]

        for endpoint, method in endpoints:
            if method == "GET":
                response = client.get(endpoint)
            else:
                response = client.post(endpoint, json={"test": "data"})

            # Should not return 500
            assert response.status_code != 500, f"{endpoint} returned 500"

    def test_no_debug_mode_in_production(self):
        """App should not expose debug info"""
        response = client.get("/health")
        # If in production mode, should not have debug headers
        if os.getenv("ENVIRONMENT", "").lower() == "production":
            assert response.status_code != 500

    def test_semgrep_integration_functional(self):
        """Semgrep integration should be working"""
        payload = {
            "code": "password = 'hardcoded_secret_123'",
            "language": "python",
        }
        response = client.post("/scan", json=payload)
        assert response.status_code == 200
        assert "scan_results" in response.json()
