import re


class LanguageDetector:
    """Detects programming language from code snippets with confidence scoring."""

    SUPPORTED_LANGUAGES = {
        "python",
        "javascript",
        "typescript",
        "java",
        "go",
        "ruby",
        "php",
    }

    PATTERNS = {
        "python": [
            (r"\bimport\s+\w+", 50),
            (r"\bfrom\s+\w+\s+import", 55),
            (r"\bdef\s+\w+\s*\(", 60),
            (r"\bclass\s+\w+\s*[:\(]", 60),
            (r"\bif\s+__name__\s*==\s*['\"]__main__['\"]", 90),
            (r"\bself\.", 65),
            (r":\s*$", 40),
            (r"\breturn\b", 30),
            (r"\belif\b", 50),
            (r"\bexcept\b", 60),
            (r"\bwith\s+", 50),
            (r"print\s*\(", 40),
        ],
        "javascript": [
            (r"\bconst\s+\w+\s*=", 70),
            (r"\blet\s+\w+\s*=", 70),
            (r"\bvar\s+\w+\s*=", 65),
            (r"=>", 80),
            (r"\bfunction\s+\w+\s*\(", 60),
            (r"\bconsole\.", 75),
            (r"\bdocument\.", 85),
            (r"\bwindow\.", 75),
            (r"require\s*\(", 65),
            (r"module\.exports", 80),
            (r"\bexport\s+(default|const|function|class)", 70),
            (r"async\s+(function|\w+\s*=>|def)", 65),
        ],
        "typescript": [
            (r"\binterface\s+\w+\s*\{", 90),
            (r"\btype\s+\w+\s*=", 85),
            (r":\s*(string|number|boolean|void|any|unknown)\s*[,;=\)]", 85),
            (r"<\w+>", 70),
            (r"\bimplements\s+\w+", 85),
            (r"\bgeneric\s*<", 80),
            (r"\bpublic\s+\w+:\s*\w+", 75),
            (r"\bprivate\s+\w+:\s*\w+", 75),
            (r"\bconst\s+\w+:\s*\w+\s*=", 80),
        ],
        "java": [
            (r"\bpublic\s+class\s+\w+", 90),
            (r"\bpublic\s+static\s+void\s+main", 95),
            (r"\bpublic\s+static\s+final", 80),
            (r"\bimport\s+java\.", 85),
            (r"\bpackage\s+[\w.]+", 85),
            (r"\bprivate\s+\w+\s+\w+", 70),
            (r"\bextends\s+\w+", 75),
            (r"\bimplements\s+\w+", 75),
            (r"\bthrows\s+\w+", 75),
            (r"new\s+\w+\s*\(", 50),
        ],
        "go": [
            (r"\bpackage\s+main", 95),
            (r"\bfunc\s+main\s*\(\)", 95),
            (r"\bfunc\s+\w+\s*\(", 70),
            (r"\bimport\s*\(", 75),
            (r":=", 75),
            (r"\berr\s+!=\s+nil", 80),
            (r"\bif\s+err\s+!=\s+nil", 85),
            (r"\bdefer\s+", 80),
            (r"\bgo\s+(func|run)", 75),
        ],
        "ruby": [
            (r"\bdef\s+\w+", 75),
            (r"\bend\b", 70),
            (r"\bputs\s+", 70),
            (r"\brequire\s+['\"]", 70),
            (r"\bclass\s+\w+", 65),
            (r"\battr_accessor\s+:", 85),
            (r"\b\.each\s+do", 75),
            (r"\b\.map\s*\{", 70),
            (r"=>", 40),
            (r"\bif\s+.*\s+then", 50),
        ],
        "php": [
            (r"<\?php", 95),
            (r"\$\w+\s*=", 80),
            (r"\bfunction\s+\w+\s*\(", 65),
            (r"\becho\s+", 75),
            (r"\bpublic\s+function", 80),
            (r"\bclass\s+\w+", 65),
            (r"\$this->", 85),
            (r"\bnamespace\s+", 75),
            (r"\buse\s+\w+", 65),
        ],
    }

    @classmethod
    def detect(cls, code: str) -> dict:
        """Detect language from code with confidence score."""
        if not code or not isinstance(code, str):
            return {"detected_language": None, "confidence": 0}

        code_lower = code.lower()
        scores = {}

        for language, patterns in cls.PATTERNS.items():
            score = 0
            matches = 0

            for pattern, weight in patterns:
                try:
                    if re.search(pattern, code, re.MULTILINE | re.IGNORECASE):
                        score += weight
                        matches += 1
                except re.error:
                    continue

            if matches > 0:
                scores[language] = min(score, 100)

        if not scores:
            return {"detected_language": None, "confidence": 0}

        detected = max(scores.items(), key=lambda x: x[1])
        return {
            "detected_language": detected[0],
            "confidence": detected[1],
        }

    @classmethod
    def is_supported(cls, language: str) -> bool:
        """Check if language is supported."""
        return (language or "").strip().lower() in cls.SUPPORTED_LANGUAGES

    @classmethod
    def get_supported_languages(cls) -> set:
        """Get set of supported languages."""
        return cls.SUPPORTED_LANGUAGES.copy()
