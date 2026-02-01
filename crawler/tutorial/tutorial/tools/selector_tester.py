"""
Selector Tester - Test CSS and XPath selectors against web pages.

Provides tools for testing selectors before adding them to provider configs.
"""

from typing import List, Optional, Any, Dict
from urllib.parse import urljoin

try:
    import requests
    from parsel import Selector
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


class SelectorTester:
    """
    Test CSS and XPath selectors against live web pages or HTML content.

    Usage:
        tester = SelectorTester()

        # Test against a URL
        results = tester.test_css(
            url="https://example.com/courses",
            selector=".course-card a::attr(href)"
        )

        # Test against HTML
        results = tester.test_css(
            html="<html>...</html>",
            selector=".course-card a::attr(href)"
        )

        # Test XPath
        results = tester.test_xpath(
            url="https://example.com",
            xpath="//div[@class='course']//a/@href"
        )
    """

    def __init__(self, user_agent: str = None):
        """Initialize the selector tester."""
        if not HAS_DEPS:
            raise ImportError(
                "SelectorTester requires 'requests' and 'parsel'. "
                "Install with: pip install requests parsel"
            )

        self.user_agent = user_agent or 'Mozilla/5.0 (compatible; CEUExplorer/1.0)'
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})

        # Cache for fetched HTML
        self._cache: Dict[str, str] = {}

    def fetch(self, url: str, use_cache: bool = True, timeout: int = 30) -> str:
        """
        Fetch HTML from a URL.

        Args:
            url: URL to fetch
            use_cache: Whether to use cached content
            timeout: Request timeout

        Returns:
            HTML content
        """
        if use_cache and url in self._cache:
            return self._cache[url]

        response = self.session.get(url, timeout=timeout)
        response.raise_for_status()
        html = response.text

        if use_cache:
            self._cache[url] = html

        return html

    def clear_cache(self):
        """Clear the HTML cache."""
        self._cache.clear()

    def test_css(
        self,
        selector: str,
        url: str = None,
        html: str = None,
        base_url: str = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Test a CSS selector.

        Args:
            selector: CSS selector to test
            url: URL to fetch and test against (optional if html provided)
            html: HTML content to test against (optional if url provided)
            base_url: Base URL for resolving relative links
            limit: Maximum results to return

        Returns:
            Dict with 'matches', 'count', and 'errors'
        """
        if not html and not url:
            return {'error': 'Must provide either url or html', 'matches': [], 'count': 0}

        try:
            if url and not html:
                html = self.fetch(url)
                base_url = base_url or url

            sel = Selector(text=html)
            matches = sel.css(selector).getall()

            # Resolve relative URLs if they look like hrefs
            if base_url and matches and matches[0].startswith(('/', '.', 'http')):
                matches = [urljoin(base_url, m) if not m.startswith('http') else m for m in matches]

            return {
                'selector': selector,
                'selector_type': 'css',
                'count': len(matches),
                'matches': matches[:limit],
                'truncated': len(matches) > limit,
                'error': None,
            }

        except Exception as e:
            return {
                'selector': selector,
                'selector_type': 'css',
                'count': 0,
                'matches': [],
                'error': str(e),
            }

    def test_xpath(
        self,
        xpath: str,
        url: str = None,
        html: str = None,
        base_url: str = None,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Test an XPath selector.

        Args:
            xpath: XPath expression to test
            url: URL to fetch and test against
            html: HTML content to test against
            base_url: Base URL for resolving relative links
            limit: Maximum results to return

        Returns:
            Dict with 'matches', 'count', and 'errors'
        """
        if not html and not url:
            return {'error': 'Must provide either url or html', 'matches': [], 'count': 0}

        try:
            if url and not html:
                html = self.fetch(url)
                base_url = base_url or url

            sel = Selector(text=html)
            matches = sel.xpath(xpath).getall()

            # Resolve relative URLs
            if base_url and matches and matches[0].startswith(('/', '.')):
                matches = [urljoin(base_url, m) if not m.startswith('http') else m for m in matches]

            return {
                'selector': xpath,
                'selector_type': 'xpath',
                'count': len(matches),
                'matches': matches[:limit],
                'truncated': len(matches) > limit,
                'error': None,
            }

        except Exception as e:
            return {
                'selector': xpath,
                'selector_type': 'xpath',
                'count': 0,
                'matches': [],
                'error': str(e),
            }

    def test_multiple(
        self,
        selectors: List[str],
        url: str = None,
        html: str = None,
        selector_type: str = 'css',
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Test multiple selectors at once.

        Args:
            selectors: List of selectors to test
            url: URL to test against
            html: HTML content to test against
            selector_type: 'css' or 'xpath'
            limit: Max results per selector

        Returns:
            List of result dicts
        """
        # Fetch once
        if url and not html:
            html = self.fetch(url)

        results = []
        for selector in selectors:
            if selector_type == 'xpath':
                result = self.test_xpath(xpath=selector, html=html, base_url=url, limit=limit)
            else:
                result = self.test_css(selector=selector, html=html, base_url=url, limit=limit)
            results.append(result)

        return results

    def find_best_selector(
        self,
        url: str = None,
        html: str = None,
        target_pattern: str = None,
        candidates: List[str] = None
    ) -> Optional[str]:
        """
        Find the best working selector from a list of candidates.

        Args:
            url: URL to test against
            html: HTML content to test against
            target_pattern: Optional pattern that matches should contain
            candidates: List of candidate selectors

        Returns:
            Best selector or None
        """
        if not candidates:
            candidates = [
                '.course a::attr(href)',
                '.course-card a::attr(href)',
                '.product a::attr(href)',
                '[class*="course"] a::attr(href)',
                '[class*="product"] a::attr(href)',
                'a[href*="/course"]::attr(href)',
                'a[href*="/product"]::attr(href)',
            ]

        if url and not html:
            html = self.fetch(url)

        best = None
        best_count = 0

        for selector in candidates:
            result = self.test_css(selector=selector, html=html, base_url=url)

            if result.get('error'):
                continue

            count = result.get('count', 0)

            # If target pattern specified, check matches
            if target_pattern and count > 0:
                matches = result.get('matches', [])
                matching = [m for m in matches if target_pattern in m]
                count = len(matching)

            if count > best_count:
                best_count = count
                best = selector

        return best

    def interactive_session(self, url: str):
        """
        Start an interactive selector testing session.

        Args:
            url: URL to test selectors against
        """
        print(f"\n{'='*60}")
        print("CEU Crawler - Interactive Selector Tester")
        print(f"{'='*60}")
        print(f"Testing URL: {url}")
        print("Type 'css <selector>' or 'xpath <xpath>' to test")
        print("Type 'quit' to exit")
        print(f"{'='*60}\n")

        try:
            html = self.fetch(url)
            print("Page loaded successfully!\n")
        except Exception as e:
            print(f"Error loading page: {e}")
            return

        while True:
            try:
                user_input = input(">> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\nExiting...")
                break

            if not user_input:
                continue

            if user_input.lower() in ('quit', 'exit', 'q'):
                break

            parts = user_input.split(maxsplit=1)
            if len(parts) < 2:
                print("Usage: css <selector> or xpath <expression>")
                continue

            cmd, selector = parts

            if cmd.lower() == 'css':
                result = self.test_css(selector=selector, html=html, base_url=url)
            elif cmd.lower() == 'xpath':
                result = self.test_xpath(xpath=selector, html=html, base_url=url)
            else:
                print(f"Unknown command: {cmd}. Use 'css' or 'xpath'")
                continue

            if result.get('error'):
                print(f"Error: {result['error']}")
            else:
                print(f"Found {result['count']} matches:")
                for i, match in enumerate(result.get('matches', []), 1):
                    # Truncate long matches
                    display = match if len(match) < 80 else match[:77] + '...'
                    print(f"  {i}. {display}")

                if result.get('truncated'):
                    print(f"  ... and {result['count'] - len(result['matches'])} more")

            print()
