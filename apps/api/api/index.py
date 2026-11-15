"""Vercel Python entrypoint for the Bicol In-Heat API.

Vercel's Python runtime picks up a top-level ASGI `app` callable (or a
`handler` class). Exposing `app` is the FastAPI-native path - no
BaseHTTPRequestHandler shim needed.

Both import roots are put on sys.path:
  - apps/api  -> `from routers import qa` resolves, the same layout the local
                 `uvicorn main:app` invocation uses.
  - repo root -> `apps.api.routers` resolves as the fallback inside main.py.

On Vercel the secrets come from the project's environment variables and
the repo-root .env does not exist, so python-dotenv inside main.py is a no-op.
"""
import os
import sys

API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO_ROOT = os.path.dirname(os.path.dirname(API_DIR))
for _path in (API_DIR, REPO_ROOT):
    if _path not in sys.path:
        sys.path.append(_path)

# Vercel requires the ASGI application to be exposed as `app`.
from main import app  # noqa: E402

__all__ = ["app"]
