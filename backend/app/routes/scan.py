import asyncio
import logging
import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from ..schemas.requests import ScanRequest
from ..schemas.responses import ScanResponse, LanguageDetectionResponse
from ..services.scan_service import ScanService
from ..services.language_detector import LanguageDetector

logger = logging.getLogger(__name__)
router = APIRouter()
service = ScanService()
detector = LanguageDetector()


@router.post("/detect", response_model=LanguageDetectionResponse)
async def detect(request: ScanRequest):
    """Detect programming language from code snippet."""
    try:
        detection = await asyncio.to_thread(detector.detect, request.code)
        detected_language = detection.get("detected_language")
        confidence = detection.get("confidence", 0)

        if detected_language is None:
            return {
                "detected_language": None,
                "confidence": 0,
                "supported": False,
                "message": "Could not detect language. Please select manually.",
            }

        is_supported = detector.is_supported(detected_language)

        if not is_supported:
            return {
                "detected_language": detected_language,
                "confidence": confidence,
                "supported": False,
                "message": f"Language detected ({detected_language}), but scanning support is not available yet.",
            }

        return {
            "detected_language": detected_language,
            "confidence": confidence,
            "supported": True,
            "message": None,
        }
    except Exception as exc:
        logger.error(f"[DETECT] Exception: {type(exc).__name__}: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Language detection failed."},
        )


@router.post("/scan", response_model=ScanResponse)
async def scan(request: ScanRequest):
    try:
        # Validate selected language
        selected_language = (request.language or "").strip().lower()
        if not selected_language:
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": "Language must be specified.",
                },
            )

        if not detector.is_supported(selected_language):
            return JSONResponse(
                status_code=400,
                content={
                    "status": "error",
                    "message": f"Unsupported language '{selected_language}'. Supported languages: {', '.join(sorted(detector.get_supported_languages()))}.",
                },
            )

        # Detect language from code for comparison
        detection = await asyncio.to_thread(detector.detect, request.code)
        detected_language = detection.get("detected_language")
        detection_confidence = detection.get("confidence", 0)

        # If language was detected with high confidence and differs from selection, warn user
        if (
            detected_language
            and detected_language != selected_language
            and detection_confidence >= 80
        ):
            logger.warning(
                f"[SCAN] Language mismatch: selected={selected_language}, detected={detected_language} (confidence={detection_confidence})"
            )

        start_time = time.time()
        logger.info(f"[SCAN] Request started for {selected_language}")

        findings = await asyncio.to_thread(
            service.analyze, request.code, selected_language
        )

        service_time = time.time() - start_time
        logger.info(
            f"[SCAN] Service completed in {service_time:.2f}s, found {len(findings)} issue(s)"
        )

        return {
            "status": "ok",
            "scan_results": findings,
            "summary": f"Detected {len(findings)} issue(s) in {selected_language} snippet.",
        }
    except ValueError as exc:
        logger.error(f"[SCAN] ValueError: {str(exc)}")
        return JSONResponse(status_code=400, content={"status": "error", "message": str(exc)})
    except TimeoutError as exc:
        logger.error(f"[SCAN] TimeoutError: {str(exc)}")
        return JSONResponse(status_code=504, content={"status": "error", "message": str(exc)})
    except Exception as exc:
        logger.error(f"[SCAN] Exception: {type(exc).__name__}: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "The scan could not be completed right now."},
        )
