#!/usr/bin/env python
"""
CEU Crawler Runner

A modular crawler framework for collecting CEU course data from multiple providers.

Commands:
    crawl       - Crawl provider websites and collect HTML
    process     - Process collected HTML with NLP extraction
    explore     - Explore new websites before configuring
    validate    - Validate provider configurations
    providers   - List and manage providers
    stats       - Show crawling and processing statistics

Usage:
    # Crawl a specific provider
    python run_crawler.py crawl pesi --max-pages 50

    # Crawl all active providers
    python run_crawler.py crawl all --max-pages 50

    # Explore a new site before configuring
    python run_crawler.py explore https://example.com/courses --find-links
    python run_crawler.py explore https://example.com/courses --suggest-config

    # Validate a provider configuration
    python run_crawler.py validate -p camft --live

    # List available providers
    python run_crawler.py providers list

    # Show statistics
    python run_crawler.py stats
"""
import argparse
import subprocess
import sys
import os
from pathlib import Path

# Add the tutorial directory to path
SCRIPT_DIR = Path(__file__).parent.absolute()
sys.path.insert(0, str(SCRIPT_DIR))


def cmd_crawl(args):
    """Crawl provider(s) and collect HTML."""
    from tutorial.core import ProviderRegistry

    registry = ProviderRegistry.instance()

    # Determine which providers to crawl
    if args.provider == 'all':
        providers = registry.list_active()
        if not providers:
            print("No active providers found. Check config/providers/")
            return False
        print(f"Crawling {len(providers)} active providers: {', '.join(providers)}")
    else:
        if not registry.has(args.provider):
            available = ', '.join(registry.list_providers())
            print(f"Unknown provider: {args.provider}")
            print(f"Available providers: {available or 'none'}")
            return False
        providers = [args.provider]

    success = True
    for provider in providers:
        print(f"\n{'='*60}")
        print(f"Crawling: {provider}")
        print('='*60)

        cmd = [sys.executable, "-m", "scrapy", "crawl", "html_collector",
               "-a", f"provider={provider}"]

        if args.max_pages:
            cmd.extend(["-a", f"max_pages={args.max_pages}"])

        if args.dry_run:
            cmd.extend(["-a", "dry_run=true"])
            # Disable all pipelines for dry-run mode
            cmd.extend(["-s", "ITEM_PIPELINES={}"])

        print(f"Running: {' '.join(cmd)}")
        print("-" * 60)

        result = subprocess.run(cmd, cwd=str(SCRIPT_DIR))
        if result.returncode != 0:
            print(f"Crawl failed for {provider}")
            success = False

    return success


def cmd_process(args):
    """Process collected HTML with NLP extraction."""
    print("\n" + "=" * 60)
    print("Processing HTML with NLP Extraction")
    print("=" * 60)

    cmd = [sys.executable, "-m", "tutorial.processing", "process",
           "--limit", str(args.limit)]

    if args.provider:
        cmd.extend(["--provider", args.provider])

    print(f"Running: {' '.join(cmd)}")
    print("-" * 60)

    result = subprocess.run(cmd, cwd=str(SCRIPT_DIR))
    return result.returncode == 0


def cmd_explore(args):
    """Explore a website for crawler configuration."""
    try:
        from tutorial.tools import HtmlExplorer
    except ImportError as e:
        print(f"Error: Missing dependencies. Install with: pip install requests beautifulsoup4 parsel")
        print(f"Details: {e}")
        return False

    explorer = HtmlExplorer()

    print(f"\n{'='*60}")
    print(f"Exploring: {args.url}")
    print('='*60)

    try:
        html = explorer.fetch(args.url)
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return False

    if args.interactive:
        explorer.interactive_session(args.url)
        return True

    if args.find_links:
        print("\nFinding course links...")
        result = explorer.find_course_links(html, args.url)

        print(f"\nFound {len(result['matches'])} potential course links:")
        for link in result['matches'][:20]:
            print(f"  {link}")

        if len(result['matches']) > 20:
            print(f"  ... and {len(result['matches']) - 20} more")

        print(f"\nWorking selectors:")
        for sel in result['selectors'][:5]:
            print(f"  {sel['selector']}: {sel['count']} matches")

    if args.suggest_config:
        print("\nSuggested configuration:")
        print("-" * 40)
        config = explorer.suggest_config(html, args.url, args.name)
        print(config)

    if args.test_selector:
        try:
            from tutorial.tools import SelectorTester
        except ImportError:
            print("Error: Missing dependencies for selector testing")
            return False

        tester = SelectorTester()
        result = tester.test_css(selector=args.test_selector, html=html, base_url=args.url)

        if result.get('error'):
            print(f"Selector error: {result['error']}")
        else:
            print(f"\nSelector '{args.test_selector}' found {result['count']} matches:")
            for match in result['matches'][:10]:
                print(f"  {match}")

    # If no specific action, show analysis
    if not any([args.find_links, args.suggest_config, args.test_selector, args.interactive]):
        analysis = explorer.analyze(html, args.url)

        print(f"\nPage Title: {analysis.title}")
        print(f"Total Links: {analysis.link_count}")
        print(f"Internal Links: {len(analysis.internal_links)}")
        print(f"Course Candidates: {len(analysis.course_candidates)}")

        print(f"\nHeadings:")
        for level, texts in analysis.headings.items():
            print(f"  {level}: {len(texts)} found")

        print(f"\nTop CSS Classes:")
        for cls in analysis.css_classes[:10]:
            print(f"  .{cls}")

        print(f"\nCourse Link Candidates:")
        for link in analysis.course_candidates[:10]:
            print(f"  {link}")

    return True


def cmd_validate(args):
    """Validate provider configurations."""
    from tutorial.tools import ConfigValidator

    validator = ConfigValidator()

    if args.file:
        print(f"Validating file: {args.file}")
        result = validator.validate_file(args.file, live=args.live)
        print(validator.format_result(result))
        return result.valid

    if args.provider:
        print(f"Validating provider: {args.provider}")
        result = validator.validate_provider(args.provider, live=args.live)
        print(validator.format_result(result))
        return result.valid

    # Validate all
    print("Validating all providers...")
    results = validator.validate_all(live=args.live)

    all_valid = True
    for name, result in results.items():
        print(validator.format_result(result))
        if not result.valid:
            all_valid = False

    return all_valid


def cmd_providers(args):
    """List and manage providers."""
    from tutorial.core import ProviderRegistry

    registry = ProviderRegistry.instance()

    if args.action == 'list':
        print("\nConfigured Providers:")
        print("-" * 50)

        for name in sorted(registry.list_providers()):
            config = registry.get(name)
            if config:
                status = "active" if config.active else "inactive"
                print(f"  {name:<15} {status:<10} {config.display_name}")
            else:
                print(f"  {name:<15} (failed to load)")

        active = registry.list_active()
        print(f"\n{len(active)} active providers")

    elif args.action == 'show':
        if not args.name:
            print("Error: --name required for 'show' action")
            return False

        config = registry.get(args.name)
        if not config:
            print(f"Provider not found: {args.name}")
            return False

        print(f"\nProvider: {config.name}")
        print("=" * 50)
        print(f"Display Name: {config.display_name}")
        print(f"Active: {config.active}")
        print(f"Base URL: {config.base_url}")
        print(f"\nStart URLs:")
        for url in config.crawl.start_urls:
            print(f"  - {url}")

        print(f"\nCrawl Settings:")
        print(f"  Download Delay: {config.crawl.download_delay}s")
        print(f"  Depth Limit: {config.crawl.depth_limit}")

        print(f"\nPatterns:")
        for ptype, patterns in config.crawl.patterns.items():
            print(f"  {ptype}:")
            for p in patterns[:5]:
                print(f"    - {p}")

        print(f"\nSelectors:")
        print(f"  CSS: {config.selectors.course_links.get('css', 'not set')}")

    return True


def cmd_stats(args):
    """Show crawling and processing statistics."""
    cmd = [sys.executable, "-m", "tutorial.processing", "stats"]
    subprocess.run(cmd, cwd=str(SCRIPT_DIR))
    return True


def main():
    parser = argparse.ArgumentParser(
        description='CEU Crawler - Modular Framework for CEU Course Data Collection',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Crawl command
    crawl_parser = subparsers.add_parser('crawl', help='Crawl provider websites')
    crawl_parser.add_argument('provider', nargs='?', default='pesi',
                             help='Provider to crawl or "all" for all active providers')
    crawl_parser.add_argument('--max-pages', '-m', type=int,
                             help='Maximum pages to crawl')
    crawl_parser.add_argument('--dry-run', action='store_true',
                             help='Log URLs without storing HTML')
    crawl_parser.add_argument('--resume', action='store_true',
                             help='Resume from checkpoint (skip already crawled URLs)')

    # Process command
    process_parser = subparsers.add_parser('process', help='Process collected HTML')
    process_parser.add_argument('--provider', '-p',
                               help='Process only this provider')
    process_parser.add_argument('--limit', '-l', type=int, default=100,
                               help='Maximum records to process (default: 100)')

    # Explore command
    explore_parser = subparsers.add_parser('explore', help='Explore websites for configuration')
    explore_parser.add_argument('url', help='URL to explore')
    explore_parser.add_argument('--find-links', action='store_true',
                               help='Find potential course links')
    explore_parser.add_argument('--suggest-config', action='store_true',
                               help='Generate suggested YAML config')
    explore_parser.add_argument('--test-selector',
                               help='Test a CSS selector')
    explore_parser.add_argument('--name',
                               help='Provider name for suggested config')
    explore_parser.add_argument('-i', '--interactive', action='store_true',
                               help='Interactive exploration mode')

    # Validate command
    validate_parser = subparsers.add_parser('validate', help='Validate configurations')
    validate_parser.add_argument('-f', '--file',
                                help='Validate specific YAML file')
    validate_parser.add_argument('-p', '--provider',
                                help='Validate specific provider')
    validate_parser.add_argument('--live', action='store_true',
                                help='Test selectors against live site')

    # Providers command
    providers_parser = subparsers.add_parser('providers', help='List and manage providers')
    providers_parser.add_argument('action', choices=['list', 'show'],
                                 help='Action to perform')
    providers_parser.add_argument('-n', '--name',
                                 help='Provider name (for show action)')

    # Stats command
    subparsers.add_parser('stats', help='Show statistics')

    # Legacy compatibility: if no subcommand, run crawl
    args = parser.parse_args()

    if not args.command:
        # Show help if no command
        parser.print_help()
        return

    # Dispatch to command handler
    handlers = {
        'crawl': cmd_crawl,
        'process': cmd_process,
        'explore': cmd_explore,
        'validate': cmd_validate,
        'providers': cmd_providers,
        'stats': cmd_stats,
    }

    handler = handlers.get(args.command)
    if handler:
        success = handler(args)
        if success is False:
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
