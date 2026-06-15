from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..schemas.requests import ScanRequest
from ..schemas.responses import ScanResponse
from ..services.scan_service import ScanService

router = APIRouter()
service = ScanService()


@router.post("/scan", response_model=ScanResponse)
async def scan(request: ScanRequest):
    try:
        findings = service.analyze(request.code, request.language)
        return {
            "status": "ok",
            "scan_results": findings,
            "summary": f"Detected {len(findings)} issue(s) in {request.language or 'code'} snippet.",
        }
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc)})
    except TimeoutError as exc:
        return JSONResponse(status_code=504, content={"status": "error", "message": str(exc)})
    except Exception:
        return JSONResponse(status_code=500, content={"status": "error", "message": "The scan could not be completed right now."})
