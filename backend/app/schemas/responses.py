from pydantic import BaseModel


class FindingResponse(BaseModel):
    vulnerability: str
    severity: str
    confidence: str
    simple_explanation: str
    attack_scenario: str
    fix_steps: list[str]
    secure_code_example: str
    learning_tip: str


class ScanResponse(BaseModel):
    status: str
    scan_results: list[FindingResponse]
    summary: str
