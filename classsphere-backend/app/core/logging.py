"""
ClassSphere Structured Logging Module.
Provides correlation ID tracking, log sanitization, and structured formatting.
"""
import logging
import re
import contextvars
from datetime import datetime, timezone

correlation_id_ctx = contextvars.ContextVar("correlation_id", default="-")

class CorrelationIdFilter(logging.Filter):
    """Injects current correlation ID into log records."""
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_ctx.get("-")
        return True

class SensitiveDataFilter(logging.Filter):
    """Sanitizes sensitive information from log messages."""
    PATTERNS = [
        (re.compile(r'(?i)password\s*[:=]\s*["\']?([^"\'\s]+)["\']?'), r'password=[REDACTED]'),
        (re.compile(r'(?i)bearer\s+[A-Za-z0-9\-._~+/]+=*'), r'Bearer [REDACTED_TOKEN]'),
        (re.compile(r'postgres://[^@]+@'), r'postgres://[REDACTED_CREDENTIALS]@'),
        (re.compile(r'postgresql\+asyncpg://[^@]+@'), r'postgresql+asyncpg://[REDACTED_CREDENTIALS]@'),
        (re.compile(r'postgresql\+psycopg://[^@]+@'), r'postgresql+psycopg://[REDACTED_CREDENTIALS]@'),
    ]

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, repl in self.PATTERNS:
                record.msg = pattern.sub(repl, record.msg)
        return True

def setup_logging(level: str = "INFO"):
    """Initializes root application logger."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level.upper())

    # Avoid duplicate handlers
    if not root_logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [cid:%(correlation_id)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z"
        )
        handler.setFormatter(formatter)
        handler.addFilter(CorrelationIdFilter())
        handler.addFilter(SensitiveDataFilter())
        root_logger.addHandler(handler)
    else:
        for handler in root_logger.handlers:
            handler.addFilter(CorrelationIdFilter())
            handler.addFilter(SensitiveDataFilter())

logger = logging.getLogger("classsphere")
