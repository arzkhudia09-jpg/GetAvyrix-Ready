import os

from fastapi import Request


async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    environment = os.getenv("ENVIRONMENT", "development").lower()

    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")

    if environment == "production":
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' https://*.vercel.app https://*.github.io; img-src 'self' data:; object-src 'none'; base-uri 'self'",
        )
    else:
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; connect-src 'self' http://localhost:8000 http://127.0.0.1:8000; img-src 'self' data:; object-src 'none'; base-uri 'self'",
        )

    return response
