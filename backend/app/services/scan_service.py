from ..ai.provider import AIProvider
from ..scanners.semgrep_engine import SemgrepEngine


class ScanService:
    MAX_FINDINGS = 6

    def __init__(self):
        self.scanner = SemgrepEngine(timeout=60)
        self.ai = AIProvider()

    def analyze(self, code: str, language: str) -> list[dict]:
        results = self.scanner.run(code, language)
        findings = []

        for item in results[: self.MAX_FINDINGS]:
            check_id = item.get("check_id", "generic-pattern")
            message = item.get("extra", {}).get("message") or item.get("message") or "Potential security issue detected"
            severity = (item.get("extra", {}).get("severity") or "medium").lower()
            line_info = self._extract_line_info(item)
            confidence = self._derive_confidence(item)
            explanation = self.ai.explain(check_id, severity, language, None, line_info, message)

            findings.append({
                "vulnerability": check_id.split(".")[-1].replace("-", " ").title(),
                "severity": severity,
                "confidence": confidence,
                "simple_explanation": message,
                "attack_scenario": explanation["attack_scenario"],
                "fix_steps": explanation["fix_steps"],
                "secure_code_example": explanation["secure_code_example"],
                "learning_tip": explanation["learning_tip"],
            })

        return findings

    def _extract_line_info(self, item: dict) -> str:
        start = item.get("start") or {}
        end = item.get("end") or {}
        line = start.get("line") or end.get("line")
        if line is not None:
            return f"line {line}"
        return "affected line information unavailable"

    def _derive_confidence(self, item: dict) -> str:
        metadata = (item.get("extra") or {}).get("metadata") or {}
        candidates = [
            metadata.get("confidence"),
            (item.get("extra") or {}).get("confidence"),
            item.get("confidence"),
        ]

        for value in candidates:
            if isinstance(value, str):
                normalized = value.strip().lower()
                if normalized in {"high", "medium", "low"}:
                    return normalized
                if normalized in {"critical", "high"}:
                    return "high"
                if normalized in {"warning", "medium"}:
                    return "medium"

        return "unknown"
