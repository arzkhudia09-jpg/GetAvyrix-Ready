import json
import shutil
import subprocess
import tempfile
from pathlib import Path


class SemgrepEngine:
    SUPPORTED_LANGUAGES = {
        "python",
        "javascript",
        "typescript",
        "java",
        "go",
        "ruby",
        "php",
    }

    def __init__(self, timeout: int = 60):
        self.timeout = timeout
        self.binary = shutil.which("semgrep") or shutil.which("semgrep.exe")
        if not self.binary:
            raise RuntimeError("Semgrep executable is not available in PATH")

    def run(self, code: str, language: str) -> list[dict]:
        if not code.strip():
            return []

        normalized_language = self._validate_language(language)

        with tempfile.TemporaryDirectory(prefix="devsecurecoach-") as tmpdir:
            file_path = Path(tmpdir) / f"snippet.{self._ext(normalized_language)}"
            file_path.write_text(code, encoding="utf-8")
            cmd = [
                self.binary,
                "scan",
                "--config",
                "auto",
                "--json",
                str(file_path),
            ]
            try:
                completed = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=self.timeout,
                    check=False,
                )
            except subprocess.TimeoutExpired as exc:
                raise TimeoutError(
                    "The scan timed out. Please try a smaller snippet."
                ) from exc

            if completed.returncode not in (0, 1):
                raise RuntimeError(
                    "The scanner could not complete the request right now."
                )

            try:
                data = json.loads(completed.stdout or "{}")
            except json.JSONDecodeError as exc:
                raise ValueError("The scanner returned an invalid response.") from exc

            return data.get("results", [])

    def _validate_language(self, language: str) -> str:
        normalized = (language or "").strip().lower()
        if normalized not in self.SUPPORTED_LANGUAGES:
            supported = ", ".join(sorted(self.SUPPORTED_LANGUAGES))
            raise ValueError(
                f"Unsupported language '{language}'. Supported languages: {supported}."
            )
        return normalized

    def _ext(self, language: str) -> str:
        mapping = {
            "python": "py",
            "javascript": "js",
            "typescript": "ts",
            "java": "java",
            "go": "go",
            "ruby": "rb",
            "php": "php",
        }
        return mapping.get(language.lower(), "txt")
