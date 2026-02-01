"""
HTML Explorer - Analyze website structure for crawler configuration.

Provides tools for exploring new websites before setting up crawler configs:
- Fetch and parse HTML from URLs
- Analyze page structure (links, classes, headings)
- Find potential course links
- Suggest initial YAML configuration
"""

import re
from typing import Dict, List, Optional, Any, Set
from urllib.parse import urlparse, urljoin
from collections import Counter
from dataclasses import dataclass, field

try:
    import requests
    from bs4 import BeautifulSoup
    from parsel import Selector
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


@dataclass
class PageAnalysis:
    """Results of analyzing a web page."""
    url: str
    title: str = ""
    headings: Dict[str, List[str]] = field(default_factory=dict)
    link_count: int = 0
    internal_links: List[str] = field(default_factory=list)
    external_links: List[str] = field(default_factory=list)
    course_candidates: List[str] = field(default_factory=list)
    css_classes: List[str] = field(default_factory=list)
    ids: List[str] = field(default_factory=list)
    forms: int = 0
    images: int = 0


@dataclass
class SuggestedConfig:
    """Suggested YAML configuration for a provider."""
    name: str
    base_url: str
    start_urls: List[str]
    listing_patterns: List[str]
    course_patterns: List[str]
    course_link_selectors: List[str]
    pagination_selectors: List[str]


class HtmlExplorer:
    """
    Tool for exploring and analyzing websites for crawler configuration.

    Usage:
        explorer = HtmlExplorer()

        # Fetch and analyze a page
        html = explorer.fetch("https://example.com/courses")
        analysis = explorer.analyze(html, "https://example.com/courses")

        # Find potential course links
        links = explorer.find_course_links(html, "https://example.com")

        # Generate starter config
        config = explorer.suggest_config(html, "https://example.com/courses")
    """

    # Common course-related URL patterns
    COURSE_URL_PATTERNS = [
        r'/course[s]?/',
        r'/product[s]?/',
        r'/class[es]?/',
        r'/training/',
        r'/webinar[s]?/',
        r'/seminar[s]?/',
        r'/program[s]?/',
        r'/workshop[s]?/',
        r'/certification/',
        r'/ceu/',
        r'/ce/',
        r'/continuing-education/',
        r'/item/',
        r'/sales/',
        r'/detail/',
        r'/\d{4,}',  # Numeric IDs (4+ digits)
    ]

    # Patterns that suggest listing/search pages
    LISTING_URL_PATTERNS = [
        r'/courses?$',
        r'/catalog',
        r'/search',
        r'/browse',
        r'/categories',
        r'/store',
        r'/products?$',
        r'/all-',
        r'/list',
    ]

    # Common skip patterns
    SKIP_PATTERNS = [
        '/cart', '/checkout', '/login', '/register', '/account',
        '/signup', '/password', '/forgot', '/auth',
        '/about', '/contact', '/privacy', '/terms', '/faq',
        '/blog', '/news', '/press', '/careers',
        '.pdf', '.jpg', '.png', '.gif', '.css', '.js',
        'javascript:', 'mailto:', 'tel:',
    ]

    # Common selectors for course listings
    COMMON_COURSE_SELECTORS = [
        '.course a',
        '.course-card a',
        '.course-item a',
        '.product a',
        '.product-card a',
        '.item a',
        '.training a',
        '.webinar a',
        'article.course a',
        '[class*="course"] a',
        '[class*="product"] a',
    ]

    def __init__(self, user_agent: str = None):
        """
        Initialize the explorer.

        Args:
            user_agent: Custom User-Agent header
        """
        if not HAS_DEPS:
            raise ImportError(
                "HtmlExplorer requires 'requests', 'beautifulsoup4', and 'parsel'. "
                "Install with: pip install requests beautifulsoup4 parsel"
            )

        self.user_agent = user_agent or 'Mozilla/5.0 (compatible; CEUExplorer/1.0; Educational Research)'
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': self.user_agent})

    def fetch(self, url: str, timeout: int = 30) -> str:
        """
        Fetch HTML content from a URL.

        Args:
            url: URL to fetch
            timeout: Request timeout in seconds

        Returns:
            HTML content as string

        Raises:
            requests.RequestException: If request fails
        """
        response = self.session.get(url, timeout=timeout)
        response.raise_for_status()
        return response.text

    def analyze(self, html: str, url: str) -> PageAnalysis:
        """
        Analyze HTML structure and extract useful information.

        Args:
            html: HTML content
            url: Source URL (for resolving relative links)

        Returns:
            PageAnalysis with extracted information
        """
        soup = BeautifulSoup(html, 'html.parser')
        parsed_url = urlparse(url)
        base_domain = parsed_url.netloc

        # Extract title
        title_tag = soup.find('title')
        title = title_tag.get_text(strip=True) if title_tag else ""

        # Extract headings
        headings = {}
        for level in range(1, 7):
            tag = f'h{level}'
            found = [h.get_text(strip=True) for h in soup.find_all(tag)]
            if found:
                headings[tag] = found[:10]  # Limit to 10

        # Extract links
        all_links = soup.find_all('a', href=True)
        internal_links = []
        external_links = []
        course_candidates = []

        for link in all_links:
            href = link.get('href', '')
            if not href or href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                continue

            absolute_url = urljoin(url, href)
            link_domain = urlparse(absolute_url).netloc

            if base_domain in link_domain:
                internal_links.append(absolute_url)

                # Check if it looks like a course link
                if self._is_likely_course_url(absolute_url):
                    course_candidates.append(absolute_url)
            else:
                external_links.append(absolute_url)

        # Extract CSS classes (for selector suggestions)
        all_classes = []
        for tag in soup.find_all(class_=True):
            classes = tag.get('class', [])
            all_classes.extend(classes)

        # Count class frequencies
        class_counts = Counter(all_classes)
        top_classes = [cls for cls, _ in class_counts.most_common(30)]

        # Extract IDs
        all_ids = [tag.get('id') for tag in soup.find_all(id=True)]
        all_ids = [id_ for id_ in all_ids if id_][:30]

        # Count forms and images
        forms_count = len(soup.find_all('form'))
        images_count = len(soup.find_all('img'))

        return PageAnalysis(
            url=url,
            title=title,
            headings=headings,
            link_count=len(all_links),
            internal_links=list(set(internal_links))[:100],
            external_links=list(set(external_links))[:50],
            course_candidates=list(set(course_candidates))[:50],
            css_classes=top_classes,
            ids=all_ids,
            forms=forms_count,
            images=images_count,
        )

    def find_course_links(
        self,
        html: str,
        base_url: str,
        custom_patterns: List[str] = None
    ) -> Dict[str, List[str]]:
        """
        Find potential course links in HTML.

        Args:
            html: HTML content
            base_url: Base URL for resolving relative links
            custom_patterns: Additional URL patterns to match

        Returns:
            Dict with 'matches' (matching URLs) and 'selectors' (working selectors)
        """
        selector = Selector(text=html)
        parsed = urlparse(base_url)
        base_domain = parsed.netloc

        patterns = self.COURSE_URL_PATTERNS.copy()
        if custom_patterns:
            patterns.extend(custom_patterns)

        # Compile patterns
        compiled = [re.compile(p, re.IGNORECASE) for p in patterns]

        # Find all links
        all_links = selector.css('a::attr(href)').getall()
        matches = []
        seen = set()

        for href in all_links:
            if not href:
                continue

            absolute_url = urljoin(base_url, href)
            if absolute_url in seen:
                continue
            seen.add(absolute_url)

            # Check domain
            link_domain = urlparse(absolute_url).netloc
            if base_domain not in link_domain:
                continue

            # Check skip patterns
            if any(skip in absolute_url.lower() for skip in self.SKIP_PATTERNS):
                continue

            # Check course patterns
            for pattern in compiled:
                if pattern.search(absolute_url):
                    matches.append(absolute_url)
                    break

        # Find working selectors
        working_selectors = []
        for css_selector in self.COMMON_COURSE_SELECTORS:
            try:
                found = selector.css(f'{css_selector}::attr(href)').getall()
                if found:
                    working_selectors.append({
                        'selector': css_selector,
                        'count': len(found),
                    })
            except Exception:
                continue

        return {
            'matches': matches,
            'selectors': working_selectors,
        }

    def suggest_config(self, html: str, url: str, provider_name: str = None) -> str:
        """
        Generate a suggested YAML configuration for a new provider.

        Args:
            html: HTML content of a main page
            url: URL of the page
            provider_name: Suggested provider name

        Returns:
            YAML configuration string
        """
        parsed = urlparse(url)
        base_domain = parsed.netloc

        # Extract name from domain if not provided
        if not provider_name:
            provider_name = base_domain.split('.')[0]
            if provider_name in ['www', 'courses', 'ondemand', 'training']:
                parts = base_domain.split('.')
                provider_name = parts[1] if len(parts) > 1 else parts[0]

        analysis = self.analyze(html, url)
        course_links = self.find_course_links(html, url)

        # Detect listing patterns
        listing_patterns = []
        for pattern in self.LISTING_URL_PATTERNS:
            if re.search(pattern, url, re.IGNORECASE):
                listing_patterns.append(pattern.replace(r'$', '').replace(r'/', '/'))
                break

        if not listing_patterns:
            path = parsed.path
            if path and path != '/':
                listing_patterns.append(path)

        # Detect course patterns from matches
        course_patterns = set()
        for link in course_links.get('matches', [])[:20]:
            link_path = urlparse(link).path
            for pattern in self.COURSE_URL_PATTERNS:
                if re.search(pattern, link_path, re.IGNORECASE):
                    # Simplify pattern for config
                    simple = pattern.replace(r'[s]?', 's').replace(r'[es]?', 'es')
                    simple = simple.replace(r'\d{4,}', '').replace(r'/', '/')
                    if simple.startswith('/') and len(simple) > 1:
                        course_patterns.add(simple.rstrip('/'))

        # Get best selectors
        selectors = course_links.get('selectors', [])
        best_selector = selectors[0]['selector'] if selectors else "a[href*='/courses/']"
        fallback_selector = selectors[1]['selector'] if len(selectors) > 1 else ""

        # Build YAML
        yaml_lines = [
            f"name: {provider_name}",
            f'display_name: "{provider_name.upper()}"',
            "active: true",
            "",
            "domains:",
            f'  - base_url: "https://{base_domain}"',
            "    primary: true",
            "",
            "crawl:",
            "  start_urls:",
            f'    - "{url}"',
            "  download_delay: 5",
            "  randomize_download_delay: true",
            "  concurrent_requests: 1",
            "  concurrent_requests_per_domain: 1",
            "  depth_limit: 3",
            "  robotstxt_obey: true",
            "  autothrottle:",
            "    enabled: true",
            "    start_delay: 2",
            "    max_delay: 15",
            "    target_concurrency: 0.5",
            "",
            "  patterns:",
            "    listing:",
        ]

        for pattern in listing_patterns[:5]:
            yaml_lines.append(f'      - "{pattern}"')

        yaml_lines.append("    course_detail:")
        for pattern in list(course_patterns)[:5]:
            yaml_lines.append(f'      - "{pattern}"')

        yaml_lines.extend([
            "    skip:",
            '      - "/cart"',
            '      - "/checkout"',
            '      - "/login"',
            '      - "/register"',
            '      - "/account"',
            "",
            "selectors:",
            "  course_links:",
            f'    css: "{best_selector}::attr(href)"',
        ])

        if fallback_selector:
            yaml_lines.append(f'    fallback_css: "{fallback_selector}::attr(href)"')

        yaml_lines.extend([
            "  pagination:",
            '    css: ".pagination a::attr(href)"',
        ])

        return "\n".join(yaml_lines)

    def _is_likely_course_url(self, url: str) -> bool:
        """Check if a URL looks like a course page."""
        url_lower = url.lower()

        # Check skip patterns
        for skip in self.SKIP_PATTERNS:
            if skip in url_lower:
                return False

        # Check course patterns
        for pattern in self.COURSE_URL_PATTERNS:
            if re.search(pattern, url_lower):
                return True

        return False

    def interactive_session(self, url: str):
        """
        Start an interactive exploration session.

        Args:
            url: Starting URL to explore
        """
        print(f"\n{'='*60}")
        print("CEU Crawler - Interactive Explorer")
        print(f"{'='*60}")
        print(f"Fetching: {url}")

        try:
            html = self.fetch(url)
        except Exception as e:
            print(f"Error fetching URL: {e}")
            return

        analysis = self.analyze(html, url)

        print(f"\nPage Title: {analysis.title}")
        print(f"Total Links: {analysis.link_count}")
        print(f"Internal Links: {len(analysis.internal_links)}")
        print(f"External Links: {len(analysis.external_links)}")
        print(f"Course Candidates: {len(analysis.course_candidates)}")

        print(f"\nHeadings:")
        for level, texts in analysis.headings.items():
            print(f"  {level}: {len(texts)} found")
            for text in texts[:3]:
                print(f"    - {text[:50]}...")

        print(f"\nTop CSS Classes:")
        for cls in analysis.css_classes[:10]:
            print(f"  .{cls}")

        print(f"\nCourse Link Candidates:")
        for link in analysis.course_candidates[:10]:
            print(f"  {link}")

        course_links = self.find_course_links(html, url)
        print(f"\nWorking Selectors:")
        for sel in course_links.get('selectors', [])[:5]:
            print(f"  {sel['selector']}: {sel['count']} matches")

        print(f"\n{'='*60}")
        print("Suggested Configuration:")
        print(f"{'='*60}")
        print(self.suggest_config(html, url))
