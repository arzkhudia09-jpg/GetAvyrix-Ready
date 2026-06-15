from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(default="python", min_length=1, max_length=40)
    filename: str | None = Field(default=None, max_length=120)


class ExplainRequest(BaseModel):
    finding: str
    severity: str
    language: str
    code: str
