# Scrapy settings for CEU Crawler project
#
# For simplicity, this file contains only settings considered important or
# commonly used. You can find more settings consulting the documentation:
#
#     https://docs.scrapy.org/en/latest/topics/settings.html
#     https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
#     https://docs.scrapy.org/en/latest/topics/spider-middleware.html

BOT_NAME = "ceu_crawler"

SCRAPY_SETTINGS = {
    # Global politeness settings
    'ROBOTSTXT_OBEY': True,
    'DOWNLOAD_DELAY': 2,
    'RANDOMIZE_DOWNLOAD_DELAY': 0.5,
    'CONCURRENT_REQUESTS': 2,
    'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
    
    # Professional identification
    'USER_AGENT': 'educational_crawler (+https://github.com/yourusername/project)',
    
    # Enable AutoThrottle
    'AUTOTHROTTLE_ENABLED': True,
    'AUTOTHROTTLE_START_DELAY': 1,
    'AUTOTHROTTLE_MAX_DELAY': 10,
    'AUTOTHROTTLE_TARGET_CONCURRENCY': 1.0,
    
    # Caching for development (avoids repeated requests)
    'HTTPCACHE_ENABLED': True,
    'HTTPCACHE_EXPIRATION_SECS': 3600,  # Cache for 1 hour
    
    'LOG_LEVEL': 'INFO',
}

SPIDER_MODULES = ["ceu_crawler.spiders"]
NEWSPIDER_MODULE = "ceu_crawler.spiders"

ADDONS = {}


# Configure item pipelines
# See https://docs.scrapy.org/en/latest/topics/item-pipeline.html
#
# Default pipeline: Direct extraction and storage (original behavior)
# For two-phase mode (html_collector spider), use HTML_STORAGE_PIPELINES below
ITEM_PIPELINES = {
    "ceu_crawler.pipelines.deduplication_pipeline.DeduplicationPipeline": 200,
    "ceu_crawler.pipelines.database_pipeline.DatabasePipeline": 300,
}

# Two-phase pipeline: HTML storage only (Phase 1)
# Use with: scrapy crawl html_collector -s ITEM_PIPELINES="$(python -c 'import ceu_crawler.settings; print(ceu_crawler.settings.HTML_STORAGE_PIPELINES)')"
# Or configure in spider's custom_settings
HTML_STORAGE_PIPELINES = {
    "ceu_crawler.pipelines.html_storage_pipeline.HtmlStoragePipeline": 300,
}

# Database configuration for database pipeline
DATABASE_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ceu_db',
    'user': 'postgres',
    'password': 'postgres'
}

# Set settings whose default value is deprecated to a future-proof value
FEED_EXPORT_ENCODING = "utf-8"