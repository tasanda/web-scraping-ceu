"""
Main Course Processor

Orchestrates the extraction pipeline:
1. Text extraction from HTML
2. NLP processing for entities
3. CEU-specific pattern matching
4. Result validation and storage
"""
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

from .text_extractor import TextExtractor, ExtractedText
from .nlp_processor import NLPProcessor, ExtractedEntities
from .ceu_patterns import CEUPatternExtractor, CEUExtractionResult

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Complete result from processing a page"""
    success: bool
    page_type: str  # "course_detail", "listing", "unknown"

    # Extracted course data (if course_detail)
    course_data: Optional[Dict] = None

    # Extraction metadata
    extraction_meta: Optional[Dict] = None

    # Error info if failed
    error: Optional[str] = None

    # Confidence score (0-1)
    overall_confidence: float = 0.0


class CourseProcessor:
    """
    Main processor that coordinates extraction from raw HTML.
    """

    def __init__(self, db_config: Dict = None):
        """
        Initialize the processor.

        Args:
            db_config: Database configuration dict with host, port, database, user, password
        """
        self.text_extractor = TextExtractor()
        self.nlp_processor = NLPProcessor()
        self.ceu_extractor = CEUPatternExtractor()

        self.db_config = db_config or {
            'host': 'localhost',
            'port': 5432,
            'database': 'ceu_db',
            'user': 'postgres',
            'password': 'postgres'
        }

        self.conn = None
        self.cursor = None

    def connect(self):
        """Open database connection"""
        if not self.conn:
            self.conn = psycopg2.connect(
                host=self.db_config['host'],
                port=self.db_config['port'],
                database=self.db_config['database'],
                user=self.db_config['user'],
                password=self.db_config['password']
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            logger.info("Database connection established")

    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        logger.info("Database connection closed")

    def process_pending(self, limit: int = 100, provider: str = None) -> Dict:
        """
        Process pending raw crawl records.

        Args:
            limit: Maximum records to process
            provider: Optional provider filter

        Returns:
            Processing statistics
        """
        self.connect()

        stats = {
            'processed': 0,
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'courses_created': 0,
            'courses_updated': 0,
        }

        try:
            # Get pending records
            query = """
                SELECT r.*, p.name as provider_name
                FROM "RawCrawlData" r
                LEFT JOIN "CeuProvider" p ON r."providerId" = p.id
                WHERE r.status = 'pending'
            """
            params = []

            if provider:
                query += ' AND p.name = %s'
                params.append(provider)

            query += ' ORDER BY r."crawledAt" DESC LIMIT %s'
            params.append(limit)

            self.cursor.execute(query, params)
            records = self.cursor.fetchall()

            logger.info(f"Found {len(records)} pending records to process")

            for record in records:
                result = self.process_record(record)
                stats['processed'] += 1

                if result.success:
                    stats['successful'] += 1
                    if result.course_data:
                        if result.extraction_meta.get('course_updated'):
                            stats['courses_updated'] += 1
                        else:
                            stats['courses_created'] += 1
                elif result.page_type != 'course_detail':
                    stats['skipped'] += 1
                else:
                    stats['failed'] += 1

        finally:
            self.disconnect()

        return stats

    def process_record(self, record: Dict) -> ProcessingResult:
        """
        Process a single raw crawl record.

        Args:
            record: Dict with raw crawl data

        Returns:
            ProcessingResult
        """
        record_id = record['id']
        url = record['url']
        html = record['htmlContent']
        page_type = record.get('pageType', 'unknown')

        logger.info(f"Processing: {url[:80]}...")

        try:
            # Mark as processing
            self._update_status(record_id, 'processing')

            # Skip non-course pages
            if page_type != 'course_detail':
                self._update_status(record_id, 'skipped')
                return ProcessingResult(
                    success=True,
                    page_type=page_type,
                    extraction_meta={'reason': 'not_course_page'}
                )

            # Run extraction pipeline
            result = self._extract_course_data(html, url, record.get('provider_name'))

            if result.success and result.course_data:
                # Store or update course
                course_id = self._store_course(result.course_data, record)

                # Update raw record
                self._update_record_success(
                    record_id,
                    result.course_data,
                    result.extraction_meta,
                    course_id
                )
            else:
                self._update_record_failed(record_id, result.error or 'Extraction failed')

            return result

        except Exception as e:
            logger.error(f"Error processing {url}: {e}")
            self._update_record_failed(record_id, str(e))
            return ProcessingResult(
                success=False,
                page_type=page_type,
                error=str(e)
            )

    def _extract_course_data(self, html: str, url: str, provider: str) -> ProcessingResult:
        """
        Run the full extraction pipeline on HTML content.
        """
        extraction_meta = {
            'methods': [],
            'timestamps': {
                'start': datetime.utcnow().isoformat()
            }
        }

        # Step 1: Extract text from HTML
        text_data = self.text_extractor.extract(html)
        extraction_meta['text_extraction'] = {
            'title_found': bool(text_data.title),
            'description_found': bool(text_data.description),
            'headings_count': len(text_data.headings),
            'structured_data_types': list(text_data.structured_data.keys())
        }

        # Step 2: NLP entity extraction
        entities = self.nlp_processor.extract_entities(text_data.full_text)
        extraction_meta['nlp_extraction'] = {
            'dates_found': len(entities.dates),
            'money_found': len(entities.money),
            'persons_found': len(entities.persons),
            'durations_found': len(entities.durations)
        }

        # Step 3: CEU-specific pattern extraction
        ceu_data = self.ceu_extractor.extract(text_data.full_text)
        extraction_meta['ceu_extraction'] = {
            'credits_confidence': ceu_data.credits_confidence,
            'price_confidence': ceu_data.price_confidence,
            'course_type_confidence': ceu_data.course_type_confidence,
            'field_confidence': ceu_data.field_confidence,
            'accreditations_found': len(ceu_data.accreditations),
            'methods_used': ceu_data.extraction_methods
        }

        # Step 4: Merge and validate results
        course_data = self._merge_extraction_results(
            text_data, entities, ceu_data, url, provider
        )

        # Calculate overall confidence
        confidence_scores = [
            ceu_data.credits_confidence,
            ceu_data.price_confidence,
            ceu_data.course_type_confidence,
            ceu_data.field_confidence,
            0.9 if text_data.title else 0.0,
            0.7 if text_data.description else 0.0,
        ]
        overall_confidence = sum(confidence_scores) / len(confidence_scores)

        extraction_meta['timestamps']['end'] = datetime.utcnow().isoformat()
        extraction_meta['overall_confidence'] = overall_confidence

        # Validate minimum requirements
        if not course_data.get('title'):
            return ProcessingResult(
                success=False,
                page_type='course_detail',
                error='No title found',
                extraction_meta=extraction_meta
            )

        return ProcessingResult(
            success=True,
            page_type='course_detail',
            course_data=course_data,
            extraction_meta=extraction_meta,
            overall_confidence=overall_confidence
        )

    def _merge_extraction_results(
        self,
        text_data: ExtractedText,
        entities: ExtractedEntities,
        ceu_data: CEUExtractionResult,
        url: str,
        provider: str
    ) -> Dict:
        """
        Merge results from different extraction methods.
        """
        # Get best date from NER
        start_date = None
        if entities.dates:
            # Sort by confidence and take first parsed date
            for date_info in sorted(entities.dates, key=lambda x: -x.get('confidence', 0)):
                if date_info.get('parsed'):
                    start_date = date_info['parsed']
                    break

        # Get price from entities if CEU extraction didn't find one
        price = ceu_data.price
        if not price and entities.money:
            for money_info in entities.money:
                if money_info.get('parsed'):
                    price = money_info['parsed']
                    break

        # Extract instructors
        instructors = self.ceu_extractor.extract_instructors(
            text_data.full_text,
            entities.persons
        )

        return {
            'title': text_data.title,
            'url': url,
            'description': text_data.description or text_data.meta_description,
            'instructors': ', '.join(instructors) if instructors else None,

            # Credits
            'credits': ceu_data.credits,
            'credits_string': ceu_data.credits_string,

            # Price
            'price': price,
            'price_string': ceu_data.price_string,
            'original_price': ceu_data.original_price,

            # Duration
            'duration': ceu_data.duration_minutes,
            'duration_string': ceu_data.duration_string,

            # Classification
            'course_type': ceu_data.course_type,
            'field': ceu_data.field,

            # Dates
            'start_date': start_date,

            # Provider
            'provider': provider,

            # Additional data from structured extraction
            'accreditations': ceu_data.accreditations,
            'structured_data': text_data.structured_data,
        }

    def _store_course(self, course_data: Dict, record: Dict) -> str:
        """
        Store or update course in database.
        """
        provider_id = record.get('providerId')
        url = course_data['url']

        # Check if course exists
        self.cursor.execute(
            'SELECT id FROM "CeuCourse" WHERE url = %s',
            (url,)
        )
        existing = self.cursor.fetchone()

        if existing:
            course_id = existing['id']
            self._update_course(course_id, course_data)
            return course_id
        else:
            return self._insert_course(course_data, provider_id)

    def _insert_course(self, data: Dict, provider_id: str) -> str:
        """Insert new course"""
        self.cursor.execute(
            """
            INSERT INTO "CeuCourse" (
                id, "providerId", title, url, description, instructors,
                price, "priceString", credits, "creditsString",
                duration, "durationString",
                field, "courseType", "startDate", "scrapedAt"
            )
            VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                provider_id,
                data.get('title'),
                data.get('url'),
                data.get('description'),
                data.get('instructors'),
                data.get('price'),
                data.get('price_string'),
                data.get('credits'),
                data.get('credits_string'),
                data.get('duration'),
                data.get('duration_string'),
                data.get('field', 'other'),
                data.get('course_type', 'on_demand'),
                data.get('start_date'),
                datetime.utcnow()
            )
        )
        course_id = self.cursor.fetchone()['id']
        self.conn.commit()
        logger.info(f"Created course: {data.get('title')[:50]}...")
        return course_id

    def _update_course(self, course_id: str, data: Dict):
        """Update existing course"""
        self.cursor.execute(
            """
            UPDATE "CeuCourse"
            SET title = %s, description = %s, instructors = %s,
                price = %s, "priceString" = %s,
                credits = %s, "creditsString" = %s,
                duration = %s, "durationString" = %s,
                field = %s, "courseType" = %s,
                "startDate" = %s, "scrapedAt" = %s
            WHERE id = %s
            """,
            (
                data.get('title'),
                data.get('description'),
                data.get('instructors'),
                data.get('price'),
                data.get('price_string'),
                data.get('credits'),
                data.get('credits_string'),
                data.get('duration'),
                data.get('duration_string'),
                data.get('field', 'other'),
                data.get('course_type', 'on_demand'),
                data.get('start_date'),
                datetime.utcnow(),
                course_id
            )
        )
        self.conn.commit()
        logger.info(f"Updated course: {data.get('title')[:50]}...")

    def _update_status(self, record_id: str, status: str):
        """Update record status"""
        self.cursor.execute(
            'UPDATE "RawCrawlData" SET status = %s WHERE id = %s',
            (status, record_id)
        )
        self.conn.commit()

    def _update_record_success(self, record_id: str, data: Dict, meta: Dict, course_id: str):
        """Update record on successful processing"""
        self.cursor.execute(
            """
            UPDATE "RawCrawlData"
            SET status = 'completed',
                "processedAt" = %s,
                "extractedData" = %s,
                "extractionMeta" = %s,
                "courseId" = %s
            WHERE id = %s
            """,
            (
                datetime.utcnow(),
                json.dumps(data, default=str),
                json.dumps(meta, default=str),
                course_id,
                record_id
            )
        )
        self.conn.commit()

    def _update_record_failed(self, record_id: str, error: str):
        """Update record on failed processing"""
        self.cursor.execute(
            """
            UPDATE "RawCrawlData"
            SET status = 'failed',
                "processedAt" = %s,
                "processingError" = %s
            WHERE id = %s
            """,
            (datetime.utcnow(), error, record_id)
        )
        self.conn.commit()
