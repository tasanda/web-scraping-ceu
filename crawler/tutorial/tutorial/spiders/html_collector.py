"""
Phase 1: HTML Collection Spider

This spider focuses ONLY on crawling and storing raw HTML content.
Processing/extraction happens in Phase 2 via the NLP processor.

Benefits:
- Fast crawling without processing overhead
- Can re-process HTML without re-crawling
- Resilient to extraction errors
- Easy to debug and iterate on extraction logic
"""
from pathlib import Path
import scrapy
import time
import hashlib
from datetime import datetime


class HtmlCollectorSpider(scrapy.Spider):
    """
    Collects raw HTML from CEU provider websites and stores it for later processing.
    """
    name = "html_collector"

    # Provider configurations - add more providers here
    PROVIDERS = {
        'pesi': {
            'start_urls': ['https://www.pesi.com/'],
            'base_url': 'www.pesi.com',
            'course_link_selector': '.fcSlide .cardItem .name a::attr(href)',
            'listing_patterns': ['/search', '/courses', '/products', '/store'],
            'course_patterns': ['/product/', '/course/', '/sales/', '/item/'],
        },
        # Add more providers here as needed
        # 'zur': {
        #     'start_urls': ['https://www.zurinstitute.com/'],
        #     'base_url': 'www.zurinstitute.com',
        #     ...
        # },
    }

    custom_settings = {
        # Conservative politeness settings
        'DOWNLOAD_DELAY': 8,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        'CONCURRENT_REQUESTS': 1,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
        'ROBOTSTXT_OBEY': True,
        'USER_AGENT': 'Mozilla/5.0 (compatible; CEUCrawler/2.0; Educational Research)',

        # AutoThrottle
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 3,
        'AUTOTHROTTLE_MAX_DELAY': 15,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 0.5,

        # Timeout and retry
        'DOWNLOAD_TIMEOUT': 30,
        'RETRY_TIMES': 2,

        # Depth limit
        'DEPTH_LIMIT': 3,

        'LOG_LEVEL': 'INFO',

        # Use our HTML storage pipeline
        'ITEM_PIPELINES': {
            'tutorial.pipelines.html_storage_pipeline.HtmlStoragePipeline': 100,
        },
    }

    def __init__(self, provider='pesi', max_pages=None, *args, **kwargs):
        self.provider_name = provider
        self.provider_config = self.PROVIDERS.get(provider)

        if not self.provider_config:
            raise ValueError(f"Unknown provider: {provider}. Available: {list(self.PROVIDERS.keys())}")

        self.max_pages = int(max_pages) if max_pages else None
        self.pages_crawled = 0
        self.urls_seen = set()

        # Set start_urls before calling super().__init__
        self._start_urls = self.provider_config['start_urls']
        super().__init__(*args, **kwargs)

    @property
    def start_urls(self):
        return self._start_urls

    @start_urls.setter
    def start_urls(self, value):
        self._start_urls = value

    def parse(self, response):
        """Main parse method - discovers and follows course links"""
        if self.max_pages and self.pages_crawled >= self.max_pages:
            self.logger.info(f'Reached max pages limit: {self.max_pages}')
            return

        self.logger.info(f'Crawling: {response.url}')

        # Determine page type
        page_type = self._determine_page_type(response.url)

        # Always store the HTML
        yield self._create_item(response, page_type)
        self.pages_crawled += 1

        # If this is a listing page, find course links
        if page_type in ['listing', 'homepage']:
            course_links = response.css(
                self.provider_config.get('course_link_selector', 'a::attr(href)')
            ).getall()

            self.logger.info(f'Found {len(course_links)} potential course links')

            for link in course_links:
                absolute_url = response.urljoin(link)

                # Skip if already seen
                if absolute_url in self.urls_seen:
                    continue

                # Skip external links
                if self.provider_config['base_url'] not in absolute_url:
                    continue

                self.urls_seen.add(absolute_url)

                # Check if it looks like a course page
                if self._is_likely_course_page(absolute_url):
                    yield scrapy.Request(
                        absolute_url,
                        callback=self.parse,
                        meta={
                            'source_url': response.url,
                            'depth': response.meta.get('depth', 0) + 1
                        }
                    )

    def _determine_page_type(self, url):
        """Determine the type of page based on URL patterns"""
        url_lower = url.lower()

        # Check course patterns
        for pattern in self.provider_config.get('course_patterns', []):
            if pattern in url_lower:
                return 'course_detail'

        # Check listing patterns
        for pattern in self.provider_config.get('listing_patterns', []):
            if pattern in url_lower:
                return 'listing'

        # Homepage
        if url_lower.rstrip('/') == f"https://{self.provider_config['base_url']}":
            return 'homepage'

        return 'unknown'

    def _is_likely_course_page(self, url):
        """Check if URL is likely a course detail page"""
        url_lower = url.lower()

        # Explicit course patterns
        for pattern in self.provider_config.get('course_patterns', []):
            if pattern in url_lower:
                return True

        # Avoid obvious non-course pages
        skip_patterns = [
            '/cart', '/checkout', '/account', '/login', '/register',
            '/about', '/contact', '/privacy', '/terms', '/faq',
            '/blog/', '/news/', '/press/', '.pdf', '.jpg', '.png',
            'javascript:', 'mailto:', 'tel:'
        ]

        for pattern in skip_patterns:
            if pattern in url_lower:
                return False

        # Default to true - we can filter later in processing
        return True

    def _create_item(self, response, page_type):
        """Create item with raw HTML and metadata"""
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
