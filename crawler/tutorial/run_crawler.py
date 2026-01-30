#!/usr/bin/env python
"""
CEU Crawler Runner

Convenience script to run the two-phase crawling process:
  Phase 1: Collect HTML pages and store in database
  Phase 2: Process stored HTML with NLP extraction

Usage:
    # Run both phases
    python run_crawler.py --provider pesi --max-pages 50

    # Run only Phase 1 (crawl)
    python run_crawler.py --provider pesi --max-pages 50 --phase 1

    # Run only Phase 2 (process)
    python run_crawler.py --phase 2 --limit 100

    # Show statistics
    python run_crawler.py --stats
"""
import argparse
import subprocess
import sys
import os

# Add the tutorial directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def run_phase1(provider: str, max_pages: int = None):
    """Run Phase 1: HTML Collection"""
    print("\n" + "=" * 60)
    print("Phase 1: HTML Collection")
    print("=" * 60)

    # Use the current Python interpreter to run scrapy as a module
    cmd = [sys.executable, "-m", "scrapy", "crawl", "html_collector", "-a", f"provider={provider}"]

    if max_pages:
        cmd.extend(["-a", f"max_pages={max_pages}"])

    print(f"Running: {' '.join(cmd)}")
    print("-" * 60)

    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))

    return result.returncode == 0


def run_phase2(limit: int = 100, provider: str = None):
    """Run Phase 2: NLP Processing"""
    print("\n" + "=" * 60)
    print("Phase 2: NLP Processing")
    print("=" * 60)

    cmd = [sys.executable, "-m", "tutorial.processing", "process", "--limit", str(limit)]

    if provider:
        cmd.extend(["--provider", provider])

    print(f"Running: {' '.join(cmd)}")
    print("-" * 60)

    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))

    return result.returncode == 0


def show_stats():
    """Show processing statistics"""
    cmd = [sys.executable, "-m", "tutorial.processing", "stats"]
    subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))


def main():
    parser = argparse.ArgumentParser(
        description='CEU Crawler - Two-Phase HTML Collection and NLP Processing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Run full pipeline (crawl + process)
    python run_crawler.py --provider pesi --max-pages 50

    # Run only crawling
    python run_crawler.py --provider pesi --max-pages 50 --phase 1

    # Run only processing on previously crawled pages
    python run_crawler.py --phase 2 --limit 100

    # Show statistics
    python run_crawler.py --stats

    # Test extraction on a URL
    python -m tutorial.processing test --url https://www.pesi.com/product/1234
        """
    )

    parser.add_argument('--provider', '-p', default='pesi',
                        help='Provider to crawl (default: pesi)')
    parser.add_argument('--max-pages', '-m', type=int, default=None,
                        help='Maximum pages to crawl in Phase 1')
    parser.add_argument('--phase', type=int, choices=[1, 2],
                        help='Run specific phase only (1=crawl, 2=process)')
    parser.add_argument('--limit', '-l', type=int, default=100,
                        help='Maximum records to process in Phase 2 (default: 100)')
    parser.add_argument('--stats', '-s', action='store_true',
                        help='Show processing statistics')

    args = parser.parse_args()

    if args.stats:
        show_stats()
        return

    success = True

    if args.phase is None or args.phase == 1:
        # Run Phase 1
        success = run_phase1(args.provider, args.max_pages)

        if not success:
            print("\nPhase 1 failed!")
            sys.exit(1)

    if args.phase is None or args.phase == 2:
        # Run Phase 2
        success = run_phase2(args.limit, args.provider)

        if not success:
            print("\nPhase 2 failed!")
            sys.exit(1)

    print("\n" + "=" * 60)
    print("Crawling Complete!")
    print("=" * 60)

    # Show final stats
    show_stats()


if __name__ == '__main__':
    main()
