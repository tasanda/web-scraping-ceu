"""
Processing CLI

Command-line interface for running the NLP extraction pipeline
on stored HTML content.

Usage:
    python -m tutorial.processing.cli process [--limit N] [--provider NAME]
    python -m tutorial.processing.cli stats
    python -m tutorial.processing.cli reprocess --id RECORD_ID
"""
import argparse
import logging
import sys
from typing import Optional

from .processor import CourseProcessor

logger = logging.getLogger(__name__)


def setup_logging(verbose: bool = False, debug: bool = False):
    """Configure logging based on verbosity level."""
    if debug:
        level = logging.DEBUG
        fmt = '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s'
    elif verbose:
        level = logging.INFO
        fmt = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    else:
        level = logging.WARNING
        fmt = '%(levelname)s - %(message)s'

    logging.basicConfig(level=level, format=fmt, force=True)

    # Also set level for our modules
    for module in ['tutorial.processing', 'tutorial.processing.processor',
                   'tutorial.processing.nlp_processor', 'tutorial.processing.text_extractor',
                   'tutorial.processing.ceu_patterns']:
        logging.getLogger(module).setLevel(level)


def process_pending(limit: int = 100, provider: Optional[str] = None, db_config: dict = None):
    """
    Process pending raw crawl records.

    Args:
        limit: Maximum records to process
        provider: Optional provider filter
        db_config: Database configuration
    """
    processor = CourseProcessor(db_config=db_config)

    logger.info(f"Starting processing (limit={limit}, provider={provider or 'all'})")

    stats = processor.process_pending(limit=limit, provider=provider)

    print("\n" + "=" * 50)
    print("Processing Complete")
    print("=" * 50)
    print(f"Total processed: {stats['processed']}")
    print(f"Successful:      {stats['successful']}")
    print(f"Failed:          {stats['failed']}")
    print(f"Skipped:         {stats['skipped']}")
    print(f"Courses created: {stats['courses_created']}")
    print(f"Courses updated: {stats['courses_updated']}")
    print("=" * 50)

    return stats


def show_stats(db_config: dict = None):
    """
    Show statistics about raw crawl data.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor

    config = db_config or {
        'host': 'localhost',
        'port': 5432,
        'database': 'ceu_db',
        'user': 'postgres',
        'password': 'postgres'
    }

    conn = psycopg2.connect(**config)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get counts by status
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM "RawCrawlData"
            GROUP BY status
            ORDER BY status
        """)
        status_counts = cursor.fetchall()

        # Get counts by provider
        cursor.execute("""
            SELECT p.name, COUNT(r.id) as count
            FROM "RawCrawlData" r
            LEFT JOIN "CeuProvider" p ON r."providerId" = p.id
            GROUP BY p.name
            ORDER BY count DESC
        """)
        provider_counts = cursor.fetchall()

        # Get counts by page type
        cursor.execute("""
            SELECT "pageType", COUNT(*) as count
            FROM "RawCrawlData"
            GROUP BY "pageType"
            ORDER BY count DESC
        """)
        page_type_counts = cursor.fetchall()

        # Get recent failures
        cursor.execute("""
            SELECT url, "processingError", "processedAt"
            FROM "RawCrawlData"
            WHERE status = 'failed'
            ORDER BY "processedAt" DESC
            LIMIT 5
        """)
        recent_failures = cursor.fetchall()

        print("\n" + "=" * 60)
        print("Raw Crawl Data Statistics")
        print("=" * 60)

        print("\nBy Status:")
        print("-" * 30)
        for row in status_counts:
            print(f"  {row['status']:15} {row['count']:>6}")

        print("\nBy Provider:")
        print("-" * 30)
        for row in provider_counts:
            name = row['name'] or 'Unknown'
            print(f"  {name:15} {row['count']:>6}")

        print("\nBy Page Type:")
        print("-" * 30)
        for row in page_type_counts:
            page_type = row['pageType'] or 'unknown'
            print(f"  {page_type:15} {row['count']:>6}")

        if recent_failures:
            print("\nRecent Failures:")
            print("-" * 60)
            for row in recent_failures:
                print(f"  URL: {row['url'][:50]}...")
                print(f"  Error: {row['processingError']}")
                print()

        print("=" * 60)

    finally:
        cursor.close()
        conn.close()


def show_failed(limit: int = 10, db_config: dict = None):
    """
    Show failed processing records.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor

    config = db_config or {
        'host': 'localhost',
        'port': 5432,
        'database': 'ceu_db',
        'user': 'postgres',
        'password': 'postgres'
    }

    conn = psycopg2.connect(**config)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("""
            SELECT id, url, "pageType", "processingError", "processedAt"
            FROM "RawCrawlData"
            WHERE status = 'failed'
            ORDER BY "processedAt" DESC
            LIMIT %s
        """, (limit,))
        records = cursor.fetchall()

        if not records:
            print("\nNo failed records found.")
            return

        print("\n" + "=" * 80)
        print(f"Failed Records ({len(records)} shown)")
        print("=" * 80)

        for record in records:
            print(f"\nID: {record['id']}")
            print(f"URL: {record['url']}")
            print(f"Page Type: {record['pageType']}")
            print(f"Processed At: {record['processedAt']}")
            print(f"Error: {record['processingError']}")
            print("-" * 80)

    finally:
        cursor.close()
        conn.close()


def reprocess_record(record_id: str, db_config: dict = None):
    """
    Reprocess a specific record by ID.
    """
    import psycopg2
    from psycopg2.extras import RealDictCursor

    config = db_config or {
        'host': 'localhost',
        'port': 5432,
        'database': 'ceu_db',
        'user': 'postgres',
        'password': 'postgres'
    }

    conn = psycopg2.connect(**config)
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Reset record to pending
        cursor.execute("""
            UPDATE "RawCrawlData"
            SET status = 'pending',
                "processedAt" = NULL,
                "processingError" = NULL,
                "extractedData" = NULL,
                "extractionMeta" = NULL,
                "courseId" = NULL
            WHERE id = %s
            RETURNING id, url
        """, (record_id,))

        result = cursor.fetchone()
        conn.commit()

        if result:
            print(f"Reset record: {result['url']}")

            # Now process it
            processor = CourseProcessor(db_config=config)

            cursor.execute("""
                SELECT r.*, p.name as provider_name
                FROM "RawCrawlData" r
                LEFT JOIN "CeuProvider" p ON r."providerId" = p.id
                WHERE r.id = %s
            """, (record_id,))
            record = cursor.fetchone()

            if record:
                result = processor.process_record(record)
                print(f"Processing result: success={result.success}, page_type={result.page_type}")
                if result.error:
                    print(f"Error: {result.error}")
                if result.course_data:
                    print(f"Course: {result.course_data.get('title', 'N/A')}")
        else:
            print(f"Record not found: {record_id}")

    finally:
        cursor.close()
        conn.close()


def test_extraction(html_file: str = None, url: str = None):
    """
    Test extraction on a local HTML file or URL.
    """
    from .text_extractor import TextExtractor
    from .nlp_processor import NLPProcessor
    from .ceu_patterns import CEUPatternExtractor

    if html_file:
        with open(html_file, 'r', encoding='utf-8') as f:
            html = f.read()
    elif url:
        import requests
        response = requests.get(url, timeout=30)
        html = response.text
    else:
        print("Error: Provide either --html-file or --url")
        return

    print("\n" + "=" * 60)
    print("Text Extraction Test")
    print("=" * 60)

    # Text extraction
    text_extractor = TextExtractor()
    text_data = text_extractor.extract(html)

    print(f"\nTitle: {text_data.title}")
    print(f"Description: {(text_data.description or '')[:200]}...")
    print(f"Headings: {len(text_data.headings)}")
    print(f"Full text length: {len(text_data.full_text)} chars")

    # NLP extraction
    print("\n" + "-" * 40)
    print("NLP Entity Extraction")
    print("-" * 40)

    nlp_processor = NLPProcessor()
    entities = nlp_processor.extract_entities(text_data.full_text)

    print(f"Dates found: {len(entities.dates)}")
    for d in entities.dates[:3]:
        print(f"  - {d['text']} (parsed: {d.get('parsed')})")

    print(f"Money found: {len(entities.money)}")
    for m in entities.money[:3]:
        print(f"  - {m['text']} (parsed: {m.get('parsed')})")

    print(f"Organizations: {len(entities.organizations)}")
    for o in entities.organizations[:3]:
        print(f"  - {o['text']}")

    print(f"Persons: {len(entities.persons)}")
    for p in entities.persons[:3]:
        print(f"  - {p['text']}")

    # CEU-specific extraction
    print("\n" + "-" * 40)
    print("CEU Pattern Extraction")
    print("-" * 40)

    ceu_extractor = CEUPatternExtractor()
    ceu_data = ceu_extractor.extract(text_data.full_text)

    print(f"Credits: {ceu_data.credits} ({ceu_data.credits_string})")
    print(f"Credits confidence: {ceu_data.credits_confidence:.2f}")
    print(f"Price: ${ceu_data.price} ({ceu_data.price_string})")
    print(f"Price confidence: {ceu_data.price_confidence:.2f}")
    print(f"Duration: {ceu_data.duration_minutes} minutes ({ceu_data.duration_string})")
    print(f"Course type: {ceu_data.course_type} ({ceu_data.course_type_confidence:.2f})")
    print(f"Field: {ceu_data.field} ({ceu_data.field_confidence:.2f})")
    print(f"Accreditations: {len(ceu_data.accreditations)}")
    for a in ceu_data.accreditations[:3]:
        print(f"  - {a['text']} ({a['type']})")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description='CEU Course Processing CLI',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Process pending records:
    python -m tutorial.processing.cli process --limit 50

  Process for specific provider:
    python -m tutorial.processing.cli process --provider pesi

  Show statistics:
    python -m tutorial.processing.cli stats

  Reprocess a specific record:
    python -m tutorial.processing.cli reprocess --id abc123

  Test extraction on HTML file:
    python -m tutorial.processing.cli test --html-file page.html

  Test extraction on URL:
    python -m tutorial.processing.cli test --url https://example.com/course
        """
    )

    # Logging options
    parser.add_argument('-v', '--verbose', action='store_true',
                        help='Enable verbose output (INFO level logging)')
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug output (DEBUG level logging with line numbers)')

    # Database connection options
    parser.add_argument('--db-host', default='localhost', help='Database host')
    parser.add_argument('--db-port', type=int, default=5432, help='Database port')
    parser.add_argument('--db-name', default='ceu_db', help='Database name')
    parser.add_argument('--db-user', default='postgres', help='Database user')
    parser.add_argument('--db-password', default='postgres', help='Database password')

    subparsers = parser.add_subparsers(dest='command', help='Command to run')

    # Process command
    process_parser = subparsers.add_parser('process', help='Process pending records')
    process_parser.add_argument('--limit', type=int, default=100,
                                help='Maximum records to process (default: 100)')
    process_parser.add_argument('--provider', type=str,
                                help='Filter by provider name')

    # Stats command
    subparsers.add_parser('stats', help='Show processing statistics')

    # Failed command
    failed_parser = subparsers.add_parser('failed', help='Show failed records')
    failed_parser.add_argument('--limit', type=int, default=10,
                               help='Maximum failed records to show (default: 10)')

    # Reprocess command
    reprocess_parser = subparsers.add_parser('reprocess', help='Reprocess a specific record')
    reprocess_parser.add_argument('--id', required=True, help='Record ID to reprocess')

    # Test command
    test_parser = subparsers.add_parser('test', help='Test extraction on HTML')
    test_parser.add_argument('--html-file', help='Path to HTML file')
    test_parser.add_argument('--url', help='URL to fetch and test')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Setup logging based on verbosity
    setup_logging(verbose=args.verbose, debug=args.debug)

    # Build database config
    db_config = {
        'host': args.db_host,
        'port': args.db_port,
        'database': args.db_name,
        'user': args.db_user,
        'password': args.db_password,
    }

    if args.command == 'process':
        process_pending(limit=args.limit, provider=args.provider, db_config=db_config)
    elif args.command == 'stats':
        show_stats(db_config=db_config)
    elif args.command == 'failed':
        show_failed(limit=args.limit, db_config=db_config)
    elif args.command == 'reprocess':
        reprocess_record(args.id, db_config=db_config)
    elif args.command == 'test':
        test_extraction(html_file=args.html_file, url=args.url)


if __name__ == '__main__':
    main()
