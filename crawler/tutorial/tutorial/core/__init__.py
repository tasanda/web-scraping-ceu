"""
Core module for the CEU Crawler Framework.

This module provides:
- ConfigLoader: Load and validate YAML configuration files
- ProviderRegistry: Central management of crawl providers
- BaseHtmlCollectorSpider: Base class for HTML collection spiders
- StorageBackend: Abstract storage backend interface
"""

from .config_loader import ConfigLoader, ProviderConfig, CrawlConfig, SelectorsConfig
from .provider_registry import ProviderRegistry

# Lazy imports for modules with optional dependencies
def __getattr__(name):
    """Lazy import for modules with optional dependencies."""
    if name == 'BaseHtmlCollectorSpider':
        from .base_spider import BaseHtmlCollectorSpider
        return BaseHtmlCollectorSpider
    elif name in ('StorageBackend', 'PostgresBackend', 'S3Backend', 'HybridBackend', 'get_storage_backend'):
        from . import storage_backends
        return getattr(storage_backends, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")

__all__ = [
    'ConfigLoader',
    'ProviderConfig',
    'CrawlConfig',
    'SelectorsConfig',
    'ProviderRegistry',
    'BaseHtmlCollectorSpider',
    'StorageBackend',
    'PostgresBackend',
    'S3Backend',
    'HybridBackend',
    'get_storage_backend',
]
