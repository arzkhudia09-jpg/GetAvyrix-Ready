from fastapi import APIRouter

from ..schemas.requests import ExplainRequest
from ..ai.provider import AIProvider

router = APIRouter()
provider = AIProvider()


@router.post("/explain")
async def explain(request: ExplainRequest):
    return provider.explain(request.finding, request.severity, request.language, request.code)
