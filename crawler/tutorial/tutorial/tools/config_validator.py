"""
Config Validator - Validate provider YAML configurations.

Provides validation for:
- YAML structure and required fields
- URL validity
- Selector testing against live sites
- Pattern matching
"""

import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from dataclasses import dataclass, field
from urllib.parse import urlparse

try:
    import requests
    from parsel import Selector
    HAS_HTTP = True
except ImportError:
    HAS_HTTP = False

from tutorial.core.config_loader import ConfigLoader, ProviderConfig


@dataclass
class ValidationResult:
    """Result of validating a provider configuration."""
    provider_name: str
    valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    selector_tests: Dict[str, Any] = field(default_factory=dict)


class ConfigValidator:
    """
    Validate provider YAML configurations.

    Usage:
        validator = ConfigValidator()

        # Validate a config file
        result = validator.validate_file("config/providers/camft.yaml")

        # Validate by provider name
        result = validator.validate_provider("camft")

        # Validate with live site testing
        result = validator.validate_provider("camft", live=True)
    """

    REQUIRED_FIELDS = [
        'name',
        'domains',
        'crawl.start_urls',
    ]

    RECOMMENDED_FIELDS = [
        'display_name',
        'crawl.patterns.course_detail',
        'crawl.patterns.listing',
        'selectors.course_links.css',
    ]

    def __init__(self, config_dir: Path = None):
        """
        Initialize the validator.

        Args:
            config_dir: Path to config directory
        """
        self.loader = ConfigLoader(config_dir)
        self.session = None

        if HAS_HTTP:
            self.session = requests.Session()
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (compatible; CEUValidator/1.0)'
            })

    def validate_file(self, file_path: str, live: bool = False) -> ValidationResult:
        """
        Validate a configuration file.

        Args:
            file_path: Path to the YAML file
            live: If True, test selectors against live site

        Returns:
            ValidationResult with errors, warnings, and suggestions
        """
        path = Path(file_path)
        if not path.exists():
            return ValidationResult(
                provider_name=path.stem,
                valid=False,
                errors=[f"File not found: {file_path}"]
            )

        provider_name = path.stem
        return self.validate_provider(provider_name, live=live)

    def validate_provider(self, provider_name: str, live: bool = False) -> ValidationResult:
        """
        Validate a provider configuration by name.

        Args:
            provider_name: Provider name (e.g., 'pesi', 'camft')
            live: If True, test selectors against live site

        Returns:
            ValidationResult
        """
        result = ValidationResult(provider_name=provider_name, valid=True)

        # Try to load the config
        try:
            config = self.loader.load_provider(provider_name)
        except FileNotFoundError:
            result.valid = False
            result.errors.append(f"Provider config not found: {provider_name}.yaml")
            return result
        except Exception as e:
            result.valid = False
            result.errors.append(f"Failed to parse config: {e}")
            return result

        # Validate structure
        self._validate_structure(config, result)

        # Validate URLs
        self._validate_urls(config, result)

        # Validate patterns
        self._validate_patterns(config, result)

        # Validate selectors (syntax only)
        self._validate_selectors(config, result)

        # Live testing (optional)
        if live and result.valid:
            self._test_live(config, result)

        # Set final validity
        result.valid = len(result.errors) == 0

        return result

    def validate_all(self, live: bool = False) -> Dict[str, ValidationResult]:
        """
        Validate all provider configurations.

        Returns:
            Dict mapping provider names to ValidationResults
        """
        results = {}
        for provider_name in self.loader.list_providers():
            results[provider_name] = self.validate_provider(provider_name, live=live)
        return results

    def _validate_structure(self, config: ProviderConfig, result: ValidationResult):
        """Validate required fields are present."""
        # Check name
        if not config.name:
            result.errors.append("Missing required field: name")

        # Check domains
        if not config.domains:
            result.errors.append("Missing required field: domains")
        else:
            # Check at least one domain has base_url
            has_base = any(d.get('base_url') for d in config.domains)
            if not has_base:
                result.errors.append("At least one domain must have 'base_url'")

        # Check start_urls
        if not config.crawl.start_urls:
            result.errors.append("Missing required field: crawl.start_urls")

        # Check recommended fields
        if not config.display_name:
            result.warnings.append("Missing recommended field: display_name")

        if not config.crawl.patterns.get('course_detail'):
            result.warnings.append(
                "Missing recommended field: crawl.patterns.course_detail - "
                "crawler may not identify course pages correctly"
            )

        if not config.selectors.course_links.get('css'):
            result.warnings.append(
                "Missing recommended field: selectors.course_links.css - "
                "crawler may not find course links"
            )

    def _validate_urls(self, config: ProviderConfig, result: ValidationResult):
        """Validate URL formats."""
        # Validate start_urls
        for url in config.crawl.start_urls:
            if not url.startswith(('http://', 'https://')):
                result.errors.append(f"Invalid start URL (must be http/https): {url}")
            else:
                parsed = urlparse(url)
                if not parsed.netloc:
                    result.errors.append(f"Invalid URL format: {url}")

        # Validate domain base_urls
        for domain in config.domains:
            base_url = domain.get('base_url', '')
            if base_url and not base_url.startswith(('http://', 'https://')):
                result.errors.append(f"Invalid domain base_url: {base_url}")

        # Check start_urls match domains
        domain_hosts = set()
        for domain in config.domains:
            base_url = domain.get('base_url', '')
            if base_url:
                parsed = urlparse(base_url)
                domain_hosts.add(parsed.netloc)

        for url in config.crawl.start_urls:
            parsed = urlparse(url)
            if parsed.netloc not in domain_hosts:
                result.warnings.append(
                    f"Start URL host '{parsed.netloc}' not in domains list"
                )

    def _validate_patterns(self, config: ProviderConfig, result: ValidationResult):
        """Validate URL patterns are valid regex."""
        patterns = config.crawl.patterns

        for pattern_type, pattern_list in patterns.items():
            if not isinstance(pattern_list, list):
                result.errors.append(
                    f"Pattern '{pattern_type}' must be a list, got {type(pattern_list).__name__}"
                )
                continue

            for pattern in pattern_list:
                try:
                    re.compile(pattern)
                except re.error as e:
                    result.errors.append(
                        f"Invalid regex in {pattern_type} pattern '{pattern}': {e}"
                    )

        # Check for common issues
        course_patterns = patterns.get('course_detail', [])
        if course_patterns:
            # Suggest escaping literal dots
            for pattern in course_patterns:
                if '.com' in pattern or '.org' in pattern:
                    result.warnings.append(
                        f"Pattern '{pattern}' contains unescaped domain - "
                        "use \\. to match literal dots"
                    )

    def _validate_selectors(self, config: ProviderConfig, result: ValidationResult):
        """Validate selector syntax."""
        course_selectors = config.selectors.course_links

        # Check CSS selectors
        for key in ['css', 'fallback_css']:
            selector = course_selectors.get(key, '')
            if selector:
                # Basic CSS validation
                if selector.count('(') != selector.count(')'):
                    result.errors.append(
                        f"Unbalanced parentheses in {key} selector: {selector}"
                    )
                if selector.count('[') != selector.count(']'):
                    result.errors.append(
                        f"Unbalanced brackets in {key} selector: {selector}"
                    )

        # Check XPath
        xpath = course_selectors.get('xpath', '')
        if xpath:
            if not xpath.startswith(('/', '.', '(')):
                result.warnings.append(
                    f"XPath usually starts with /, . or ( - got: {xpath[:20]}..."
                )

    def _test_live(self, config: ProviderConfig, result: ValidationResult):
        """Test selectors against live site."""
        if not HAS_HTTP:
            result.warnings.append(
                "Live testing skipped - install 'requests' and 'parsel'"
            )
            return

        if not self.session:
            return

        # Fetch first start URL
        test_url = config.crawl.start_urls[0]
        result.suggestions.append(f"Testing against: {test_url}")

        try:
            response = self.session.get(test_url, timeout=30)
            response.raise_for_status()
            html = response.text
        except Exception as e:
            result.warnings.append(f"Failed to fetch test URL: {e}")
            return

        # Test selectors
        selector = Selector(text=html)
        selectors_config = config.selectors.course_links

        test_results = {}

        # Test CSS selector
        css = selectors_config.get('css', '')
        if css:
            try:
                matches = selector.css(css).getall()
                test_results['css'] = {
                    'selector': css,
                    'count': len(matches),
                    'sample': matches[:5],
                }
                if not matches:
                    result.warnings.append(
                        f"CSS selector '{css}' returned no matches on test page"
                    )
            except Exception as e:
                result.errors.append(f"CSS selector error: {e}")
                test_results['css'] = {'error': str(e)}

        # Test fallback CSS
        fallback = selectors_config.get('fallback_css', '')
        if fallback:
            try:
                matches = selector.css(fallback).getall()
                test_results['fallback_css'] = {
                    'selector': fallback,
                    'count': len(matches),
                    'sample': matches[:5],
                }
            except Exception as e:
                test_results['fallback_css'] = {'error': str(e)}

        result.selector_tests = test_results

        # Add suggestions based on results
        if test_results.get('css', {}).get('count', 0) == 0:
            if test_results.get('fallback_css', {}).get('count', 0) > 0:
                result.suggestions.append(
                    "Consider swapping CSS and fallback_css - fallback found matches"
                )
            else:
                result.suggestions.append(
                    "No course links found - try exploring the page with: "
                    "python run_crawler.py explore <url> --find-links"
                )

    def format_result(self, result: ValidationResult) -> str:
        """Format validation result for display."""
        lines = [
            f"\nValidation Results: {result.provider_name}",
            "=" * 50,
        ]

        status = "VALID" if result.valid else "INVALID"
        lines.append(f"Status: {status}")

        if result.errors:
            lines.append(f"\nErrors ({len(result.errors)}):")
            for error in result.errors:
                lines.append(f"  - {error}")

        if result.warnings:
            lines.append(f"\nWarnings ({len(result.warnings)}):")
            for warning in result.warnings:
                lines.append(f"  - {warning}")

        if result.suggestions:
            lines.append(f"\nSuggestions:")
            for suggestion in result.suggestions:
                lines.append(f"  - {suggestion}")

        if result.selector_tests:
            lines.append(f"\nSelector Test Results:")
            for name, data in result.selector_tests.items():
                if 'error' in data:
                    lines.append(f"  {name}: ERROR - {data['error']}")
                else:
                    lines.append(f"  {name}: {data.get('count', 0)} matches")
                    for sample in data.get('sample', [])[:3]:
                        display = sample if len(sample) < 60 else sample[:57] + '...'
                        lines.append(f"    - {display}")

        return "\n".join(lines)
