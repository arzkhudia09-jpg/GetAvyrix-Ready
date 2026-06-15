import os


class AIProvider:
    """Simple provider abstraction for future OpenAI integration."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")

    def explain(self, finding: str, severity: str, language: str, code: str | None = None, line_info: str = "", message: str | None = None) -> dict:
        display_message = message or finding
        line_hint = f" at {line_info}" if line_info else ""
        # Production-ready structure; can be swapped to OpenAI later.
        return {
            "simple_explanation": f"{display_message}{line_hint} in {language} can introduce real security risk when untrusted input reaches sensitive operations.",
            "attack_scenario": "An attacker supplies crafted input that triggers the vulnerable pattern, leading to data exposure, code execution, or privilege abuse.",
            "fix_steps": [
                "Validate and sanitize all untrusted input.",
                "Prefer safe APIs and parameterized operations.",
                "Store secrets in environment variables or a secret manager.",
            ],
            "secure_code_example": "# Secure example placeholder\n# Replace with provider-generated guidance when OpenAI is configured.",
            "learning_tip": f"Review the vulnerable pattern in your {language} snippet and compare it with safer alternatives before deployment.",
            "severity": severity.upper(),
        }
