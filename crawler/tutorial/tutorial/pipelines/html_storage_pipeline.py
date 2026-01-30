"""
HTML Storage Pipeline

Stores raw HTML content in PostgreSQL for later processing.
Part of the two-phase crawling architecture.
"""
import psycopg2
from psycopg2.extras import RealDictCursor
from itemadapter import ItemAdapter
from datetime import datetime


class HtmlStoragePipeline:
    """
    Pipeline to store raw HTML content in the RawCrawlData table.
    """

    def __init__(self):
        self.conn = None
        self.cursor = None
        self.provider_cache = {}  # Cache provider IDs

    def open_spider(self, spider):
        """Open database connection when spider starts"""
        try:
            db_config = spider.settings.get('DATABASE_CONFIG', {})

            self.conn = psycopg2.connect(
                host=db_config.get('host', 'localhost'),
                port=db_config.get('port', 5432),
                database=db_config.get('database', 'ceu_db'),
                user=db_config.get('user', 'postgres'),
                password=db_config.get('password', 'postgres')
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            spider.logger.info('HTML Storage Pipeline: Database connection opened')
        except Exception as e:
            spider.logger.error(f'HTML Storage Pipeline: Failed to connect - {e}')
            raise

    def close_spider(self, spider):
        """Close database connection when spider closes"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        spider.logger.info('HTML Storage Pipeline: Database connection closed')

    def process_item(self, item, spider):
        """Store raw HTML in database"""
        adapter = ItemAdapter(item)

        try:
            # Get or create provider
            provider_id = self._get_or_create_provider(
                adapter.get('provider', 'unknown'),
                spider
            )

            # Check if URL already exists
            existing = self._get_existing_record(adapter.get('url'), spider)

            if existing:
                # Update existing record
                self._update_record(existing['id'], adapter, provider_id, spider)
            else:
                # Insert new record
                self._insert_record(adapter, provider_id, spider)

        except Exception as e:
            spider.logger.error(f'HTML Storage Pipeline: Error - {e}')
            # Don't fail the pipeline, just log

        return item

    def _get_or_create_provider(self, provider_name, spider):
        """Get provider ID, creating if necessary"""
        # Check cache first
        if provider_name in self.provider_cache:
            return self.provider_cache[provider_name]

        # Check database
        self.cursor.execute(
            'SELECT id FROM "CeuProvider" WHERE name = %s',
            (provider_name,)
        )
        result = self.cursor.fetchone()

        if result:
            self.provider_cache[provider_name] = result['id']
            return result['id']

        # Create new provider
        self.cursor.execute(
            """
            INSERT INTO "CeuProvider" (id, name, "baseUrl", active)
            VALUES (gen_random_uuid(), %s, %s, true)
            RETURNING id
            """,
            (provider_name, f'https://www.{provider_name}.com')
        )
        provider_id = self.cursor.fetchone()['id']
        self.conn.commit()
        self.provider_cache[provider_name] = provider_id
        spider.logger.info(f'Created new provider: {provider_name}')

        return provider_id

    def _get_existing_record(self, url, spider):
        """Check if URL already exists in RawCrawlData"""
        if not url:
            return None

        self.cursor.execute(
            'SELECT id, status FROM "RawCrawlData" WHERE url = %s',
            (url,)
        )
        return self.cursor.fetchone()

    def _insert_record(self, adapter, provider_id, spider):
        """Insert new raw crawl record"""
        self.cursor.execute(
            """
            INSERT INTO "RawCrawlData" (
                id, url, "providerId", "htmlContent", "httpStatus",
                "contentType", "crawledAt", status, "sourceUrl", "pageType"
            )
            VALUES (
                gen_random_uuid(), %s, %s, %s, %s,
                %s, %s, 'pending', %s, %s
            )
            RETURNING id
            """,
            (
                adapter.get('url'),
                provider_id,
                adapter.get('html_content'),
                adapter.get('http_status', 200),
                adapter.get('content_type'),
                datetime.fromisoformat(adapter.get('crawled_at')) if adapter.get('crawled_at') else datetime.utcnow(),
                adapter.get('source_url'),
                adapter.get('page_type', 'unknown')
            )
        )
        record_id = self.cursor.fetchone()['id']
        self.conn.commit()
        spider.logger.info(f'Stored HTML: {adapter.get("url")[:80]}...')

    def _update_record(self, record_id, adapter, provider_id, spider):
        """Update existing raw crawl record"""
        self.cursor.execute(
            """
            UPDATE "RawCrawlData"
            SET "htmlContent" = %s,
                "httpStatus" = %s,
                "contentType" = %s,
                "crawledAt" = %s,
                status = 'pending',
                "sourceUrl" = %s,
                "pageType" = %s,
                "processedAt" = NULL,
                "extractedData" = NULL,
                "extractionMeta" = NULL
            WHERE id = %s
            """,
            (
                adapter.get('html_content'),
                adapter.get('http_status', 200),
                adapter.get('content_type'),
                datetime.fromisoformat(adapter.get('crawled_at')) if adapter.get('crawled_at') else datetime.utcnow(),
                adapter.get('source_url'),
                adapter.get('page_type', 'unknown'),
                record_id
            )
        )
        self.conn.commit()
        spider.logger.info(f'Updated HTML: {adapter.get("url")[:80]}...')
