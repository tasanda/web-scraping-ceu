"""
Base Spider Class for HTML Collection.

Provides common functionality for all provider spiders, including:
- Configuration loading from the registry
- URL pattern matching
- Page type detection
- Dry-run mode
- Checkpoint/resume capability
"""

import re
import hashlib
from abc import ABC
from datetime import datetime
from typing import Optional, Set, Dict, Any, List
from urllib.parse import urlparse

import scrapy
from scrapy.http import Response

from .provider_registry import ProviderRegistry
from .config_loader import ProviderConfig


class BaseHtmlCollectorSpider(scrapy.Spider, ABC):
    """
    Abstract base class for HTML collection spiders.

    Subclasses can override specific methods to customize behavior
    for different providers while inheriting common functionality.

    Features:
    - Loads configuration from YAML via ProviderRegistry
    - URL pattern matching for page type detection
    - Deduplication of URLs
    - Max pages limit
    - Dry-run mode (doesn't store, just logs)
    - Checkpoint/resume support

    Usage:
        class HtmlCollectorSpider(BaseHtmlCollectorSpider):
            name = "html_collector"

        # Run via scrapy:
        scrapy crawl html_collector -a provider=pesi -a max_pages=50
    """

    name = "base_html_collector"

    # Default settings - can be overridden by provider config
    DEFAULT_SETTINGS = {
        'DOWNLOAD_DELAY': 5,
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
            'tutorial.pipelines.html_storage_pipeline.HtmlStoragePipeline': 100,
        },
    }

    # Common patterns to skip
    GLOBAL_SKIP_PATTERNS = [
        '/cart', '/checkout', '/account', '/login', '/register',
        '/about', '/contact', '/privacy', '/terms', '/faq',
        '/blog/', '/news/', '/press/', '.pdf', '.jpg', '.png',
        'javascript:', 'mailto:', 'tel:', '/signup', '/password',
    ]

    def __init__(
        self,
        provider: str = 'pesi',
        max_pages: Optional[int] = None,
        dry_run: bool = False,
        resume: bool = False,
        *args,
        **kwargs
    ):
        """
        Initialize the spider.

        Args:
            provider: Provider name (must exist in config)
            max_pages: Maximum pages to crawl (None for unlimited)
            dry_run: If True, don't store HTML, just log URLs
            resume: If True, skip URLs already in database
        """
        self.provider_name = provider
        self.max_pages = int(max_pages) if max_pages else None
        self.dry_run = dry_run if isinstance(dry_run, bool) else str(dry_run).lower() == 'true'
        self.resume = resume if isinstance(resume, bool) else str(resume).lower() == 'true'

        # Load provider configuration
        self._registry = ProviderRegistry.instance()
        self._config: ProviderConfig = self._registry.get_or_raise(provider)

        # Tracking state
        self.pages_crawled = 0
        self.urls_seen: Set[str] = set()
        self.urls_stored: Set[str] = set()

        # Compile regex patterns for faster matching
        self._compiled_patterns = self._compile_patterns()

        # Set start_urls before super().__init__
        self._start_urls = self._config.crawl.start_urls
        super().__init__(*args, **kwargs)

        self.logger.info(f"Initialized spider for provider: {provider}")
        self.logger.info(f"Max pages: {self.max_pages or 'unlimited'}")
        self.logger.info(f"Dry run: {self.dry_run}")

    @classmethod
    def update_settings(cls, settings):
        """
        Update Scrapy settings based on provider config.

        This is called by Scrapy during spider initialization.
        """
        # Start with default settings
        for key, value in cls.DEFAULT_SETTINGS.items():
            settings.setdefault(key, value)

    @property
    def custom_settings(self) -> Dict[str, Any]:
        """
        Generate custom settings based on provider configuration.

        These settings override the defaults for this specific spider.
        """
        settings = self.DEFAULT_SETTINGS.copy()

        # Only merge provider settings if config is loaded
        if hasattr(self, '_config') and self._config:
            provider_settings = self._config.to_spider_settings()
            settings.update(provider_settings)

        return settings

    @property
    def start_urls(self) -> List[str]:
        """Get start URLs from provider config."""
        return self._start_urls

    @start_urls.setter
    def start_urls(self, value: List[str]):
        """Set start URLs (required by Scrapy)."""
        self._start_urls = value

    def _compile_patterns(self) -> Dict[str, List[re.Pattern]]:
        """Compile URL patterns into regex for efficient matching."""
        patterns = {}
        for pattern_type in ['listing', 'course_detail', 'skip']:
            raw_patterns = self._config.crawl.patterns.get(pattern_type, [])
            compiled = []
            for p in raw_patterns:
                try:
                    # If pattern looks like a regex (contains \d, \w, etc.), compile it
                    if any(c in p for c in ['\\d', '\\w', '\\s', '+', '*', '?', '^', '$']):
                        compiled.append(re.compile(p, re.IGNORECASE))
                    else:
                        # Simple string pattern - escape and compile
                        compiled.append(re.compile(re.escape(p), re.IGNORECASE))
                except re.error:
                    # Fall back to escaped literal
                    compiled.append(re.compile(re.escape(p), re.IGNORECASE))
            patterns[pattern_type] = compiled
        return patterns

    def parse(self, response: Response):
        """
        Main parse method - handles all page types.

        Discovers course links on listing pages and stores HTML for all pages.
        """
        if self.max_pages and self.pages_crawled >= self.max_pages:
            self.logger.info(f'Reached max pages limit: {self.max_pages}')
            return

        self.logger.info(f'Crawling: {response.url}')

        # Determine page type
        page_type = self._determine_page_type(response.url)

        # Create and yield item (unless dry run)
        if not self.dry_run:
            yield self._create_item(response, page_type)
        else:
            self.logger.info(f'[DRY RUN] Would store: {response.url} ({page_type})')

        self.pages_crawled += 1

        # If this is a listing page, find and follow course links
        if page_type in ['listing', 'homepage']:
            yield from self._extract_and_follow_links(response)

    def _determine_page_type(self, url: str) -> str:
        """
        Determine the type of page based on URL patterns.

        Returns:
            One of: 'course_detail', 'listing', 'homepage', 'unknown'
        """
        url_lower = url.lower()

        # Check course detail patterns
        for pattern in self._compiled_patterns.get('course_detail', []):
            if pattern.search(url_lower):
                return 'course_detail'

        # Check listing patterns
        for pattern in self._compiled_patterns.get('listing', []):
            if pattern.search(url_lower):
                return 'listing'

        # Homepage check
        base_domain = self._config.base_domain
        parsed = urlparse(url)
        if parsed.netloc == base_domain and (parsed.path == '' or parsed.path == '/'):
            return 'homepage'

        return 'unknown'

    def _extract_and_follow_links(self, response: Response):
        """
        Extract course links from listing pages and yield requests.
        """
        # Try primary selector
        course_links = []
        selectors = self._config.selectors.course_links

        # Try CSS selector
        if selectors.get('css'):
            course_links = response.css(selectors['css']).getall()

        # Try fallback if no results
        if not course_links and selectors.get('fallback_css'):
            course_links = response.css(selectors['fallback_css']).getall()

        # Try XPath if configured
        if not course_links and selectors.get('xpath'):
            course_links = response.xpath(selectors['xpath']).getall()

        self.logger.info(f'Found {len(course_links)} potential course links')

        base_domain = self._config.base_domain

        for link in course_links:
            absolute_url = response.urljoin(link)

            # Skip if already seen
            if absolute_url in self.urls_seen:
                continue

            # Skip external links
            parsed = urlparse(absolute_url)
            if base_domain not in parsed.netloc:
                continue

            self.urls_seen.add(absolute_url)

            # Check if it's a valid page to follow
            if self._should_follow_url(absolute_url):
                yield scrapy.Request(
                    absolute_url,
                    callback=self.parse,
                    meta={
                        'source_url': response.url,
                        'depth': response.meta.get('depth', 0) + 1
                    }
                )

    def _should_follow_url(self, url: str) -> bool:
        """
        Determine if a URL should be followed.

        Checks against skip patterns and validates it looks like a valid page.
        """
        url_lower = url.lower()

        # Check skip patterns from config
        for pattern in self._compiled_patterns.get('skip', []):
            if pattern.search(url_lower):
                return False

        # Check global skip patterns
        for pattern in self.GLOBAL_SKIP_PATTERNS:
            if pattern in url_lower:
                return False

        return True

    def _is_likely_course_page(self, url: str) -> bool:
        """
        Check if URL is likely a course detail page.

        This is used for more aggressive filtering when following links.
        """
        url_lower = url.lower()

        # Check explicit course patterns
        for pattern in self._compiled_patterns.get('course_detail', []):
            if pattern.search(url_lower):
                return True

        # Check if should be skipped
        if not self._should_follow_url(url):
            return False

        # Default to true - we can filter later in processing
        return True

    def _create_item(self, response: Response, page_type: str) -> Dict[str, Any]:
        """
        Create item with raw HTML and metadata for storage.

        Args:
            response: Scrapy response object
            page_type: Detected page type

        Returns:
            Dict containing all item fields
        """
        return {
            'url': response.url,
            'html_content': response.text,
            'http_status': response.status,
            'content_type': response.headers.get('Content-Type', b'').decode('utf-8', errors='ignore'),
            'source_url': response.meta.get('source_url'),
            'page_type': page_type,
            'provider': self.provider_name,
            'crawled_at': datetime.utcnow().isoformat(),
            'content_hash': hashlib.md5(response.body).hexdigest(),
        }

    def closed(self, reason: str):
        """Called when spider is closed."""
        self.logger.info(f"Spider closed: {reason}")
        self.logger.info(f"Total pages crawled: {self.pages_crawled}")
        self.logger.info(f"Unique URLs seen: {len(self.urls_seen)}")
