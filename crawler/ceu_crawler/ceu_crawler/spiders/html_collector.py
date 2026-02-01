"""
Phase 1: HTML Collection Spider

This spider focuses ONLY on crawling and storing raw HTML content.
Processing/extraction happens in Phase 2 via the NLP processor.

Benefits:
- Fast crawling without processing overhead
- Can re-process HTML without re-crawling
- Resilient to extraction errors
- Easy to debug and iterate on extraction logic

Configuration:
- Provider settings are loaded from YAML files in config/providers/
- Add new providers by creating a new YAML config file
- See config/providers/_template.yaml for the format

Usage:
    # Crawl a specific provider
    scrapy crawl html_collector -a provider=pesi -a max_pages=50

    # Dry run (logs URLs without storing)
    scrapy crawl html_collector -a provider=pesi -a max_pages=10 -a dry_run=true

    # Crawl all active providers
    python run_crawler.py crawl all --max-pages 50
"""

from ceu_crawler.core.base_spider import BaseHtmlCollectorSpider


class HtmlCollectorSpider(BaseHtmlCollectorSpider):
    """
    Collects raw HTML from CEU provider websites and stores it for later processing.

    This spider inherits all functionality from BaseHtmlCollectorSpider:
    - Provider configuration from YAML files
    - URL pattern matching for page type detection
    - Automatic link discovery and following
    - Deduplication of URLs
    - Max pages limit
    - Dry-run mode

    Override methods in this class to customize behavior for specific needs.
    """

    name = "html_collector"

    # Default pipeline for HTML storage
    custom_settings = {
        'DOWNLOAD_DELAY': 8,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS': 1,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
        'ROBOTSTXT_OBEY': True,
        'USER_AGENT': 'Mozilla/5.0 (compatible; CEUCrawler/2.0; Educational Research)',
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 3,
        'AUTOTHROTTLE_MAX_DELAY': 15,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 0.5,
        'DOWNLOAD_TIMEOUT': 30,
        'RETRY_TIMES': 2,
        'DEPTH_LIMIT': 3,
        'LOG_LEVEL': 'INFO',
        'ITEM_PIPELINES': {
            'ceu_crawler.pipelines.html_storage_pipeline.HtmlStoragePipeline': 100,
        },
    }

    def __init__(self, provider='pesi', max_pages=None, dry_run=False, *args, **kwargs):
        """
        Initialize the HTML collector spider.

        Args:
            provider: Provider name (must exist in config/providers/)
            max_pages: Maximum number of pages to crawl
            dry_run: If 'true', don't store HTML, just log URLs
        """
        # Handle dry_run before super().__init__ for settings
        is_dry_run = dry_run if isinstance(dry_run, bool) else str(dry_run).lower() == 'true'

        # Disable pipelines for dry run mode
        if is_dry_run:
            self.custom_settings = self.custom_settings.copy()
            self.custom_settings['ITEM_PIPELINES'] = {}

        super().__init__(
            provider=provider,
            max_pages=max_pages,
            dry_run=dry_run,
            *args,
            **kwargs
        )

        # Merge provider-specific settings with custom_settings
        if self._config:
            provider_settings = self._config.to_spider_settings()
            # Update our custom_settings with provider config
            for key, value in provider_settings.items():
                if key not in ['ITEM_PIPELINES']:  # Don't override pipelines
                    self.custom_settings[key] = value
