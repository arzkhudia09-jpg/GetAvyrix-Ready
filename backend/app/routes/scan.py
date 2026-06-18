import asyncio
import logging
import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..schemas.requests import ScanRequest
from ..schemas.responses import ScanResponse
from ..services.scan_service import ScanService

logger = logging.getLogger(__name__)
router = APIRouter()
service = ScanService()


@router.post("/scan", response_model=ScanResponse)
async def scan(request: ScanRequest):
    try:
        start_time = time.time()
        logger.info(f"[SCAN] Request started for {request.language}")

        findings = await asyncio.to_thread(service.analyze, request.code, request.language)

        service_time = time.time() - start_time
        logger.info(f"[SCAN] Service completed in {service_time:.2f}s, found {len(findings)} issue(s)")

        return {
            "status": "ok",
            "scan_results": findings,
            "summary": f"Detected {len(findings)} issue(s) in {request.language or 'code'} snippet.",
        }
    except ValueError as exc:
        logger.error(f"[SCAN] ValueError: {str(exc)}")
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc)})
    except TimeoutError as exc:
        logger.error(f"[SCAN] TimeoutError: {str(exc)}")
        return JSONResponse(status_code=504, content={"status": "error", "message": str(exc)})
    except Exception as exc:
        logger.error(f"[SCAN] Exception: {type(exc).__name__}: {str(exc)}")
        return JSONResponse(status_code=500, content={"status": "error", "message": "The scan could not be completed right now."})
