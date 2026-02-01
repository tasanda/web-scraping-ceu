"""
Configuration loader for YAML-based provider and environment configs.

Handles loading, validation, and environment variable interpolation
for all configuration files.
"""

import os
import re
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field


@dataclass
class CrawlConfig:
    """Crawl-specific configuration for a provider."""
    start_urls: List[str]
    download_delay: float = 5.0
    randomize_download_delay: bool = True
    concurrent_requests: int = 1
    concurrent_requests_per_domain: int = 1
    depth_limit: int = 3
    robotstxt_obey: bool = True
    autothrottle: Dict[str, Any] = field(default_factory=dict)
    patterns: Dict[str, List[str]] = field(default_factory=dict)


@dataclass
class SelectorsConfig:
    """CSS/XPath selectors for extracting data from pages."""
    course_links: Dict[str, str] = field(default_factory=dict)
    pagination: Dict[str, str] = field(default_factory=dict)


@dataclass
class ProviderConfig:
    """Complete provider configuration."""
    name: str
    display_name: str
    active: bool
    domains: List[Dict[str, Any]]
    crawl: CrawlConfig
    selectors: SelectorsConfig
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def base_url(self) -> str:
        """Get the primary base URL for this provider."""
        for domain in self.domains:
            if domain.get('primary', False):
                return domain['base_url']
        return self.domains[0]['base_url'] if self.domains else ''

    @property
    def base_domain(self) -> str:
        """Get the domain portion of the base URL (e.g., 'www.pesi.com')."""
        from urllib.parse import urlparse
        return urlparse(self.base_url).netloc

    def to_spider_settings(self) -> Dict[str, Any]:
        """Convert to Scrapy spider custom_settings format."""
        settings = {
            'DOWNLOAD_DELAY': self.crawl.download_delay,
            'RANDOMIZE_DOWNLOAD_DELAY': self.crawl.randomize_download_delay,
            'CONCURRENT_REQUESTS': self.crawl.concurrent_requests,
            'CONCURRENT_REQUESTS_PER_DOMAIN': self.crawl.concurrent_requests_per_domain,
            'DEPTH_LIMIT': self.crawl.depth_limit,
            'ROBOTSTXT_OBEY': self.crawl.robotstxt_obey,
        }

        if self.crawl.autothrottle:
            settings['AUTOTHROTTLE_ENABLED'] = self.crawl.autothrottle.get('enabled', True)
            settings['AUTOTHROTTLE_START_DELAY'] = self.crawl.autothrottle.get('start_delay', 3)
            settings['AUTOTHROTTLE_MAX_DELAY'] = self.crawl.autothrottle.get('max_delay', 15)
            settings['AUTOTHROTTLE_TARGET_CONCURRENCY'] = self.crawl.autothrottle.get('target_concurrency', 0.5)

        return settings

    def to_legacy_format(self) -> Dict[str, Any]:
        """Convert to the legacy PROVIDERS dict format for backwards compatibility."""
        return {
            'start_urls': self.crawl.start_urls,
            'base_url': self.base_domain,
            'course_link_selector': self.selectors.course_links.get('css', ''),
            'fallback_selector': self.selectors.course_links.get('fallback_css', ''),
            'listing_patterns': self.crawl.patterns.get('listing', []),
            'course_patterns': self.crawl.patterns.get('course_detail', []),
            'skip_patterns': self.crawl.patterns.get('skip', []),
        }


@dataclass
class EnvironmentConfig:
    """Environment-specific configuration."""
    environment: str
    storage: Dict[str, Any]
    crawl: Dict[str, Any] = field(default_factory=dict)
    logging: Dict[str, Any] = field(default_factory=dict)
    output: Dict[str, Any] = field(default_factory=dict)
    glue: Dict[str, Any] = field(default_factory=dict)


class ConfigLoader:
    """
    Load and manage YAML configuration files for providers and environments.

    Usage:
        loader = ConfigLoader()

        # Load a specific provider
        pesi_config = loader.load_provider('pesi')

        # Load all active providers
        providers = loader.load_all_providers()

        # Load environment config
        env_config = loader.load_environment('local')
    """

    ENV_VAR_PATTERN = re.compile(r'\$\{([^}:]+)(?::-([^}]*))?\}')

    def __init__(self, config_dir: Optional[Path] = None):
        """
        Initialize the config loader.

        Args:
            config_dir: Path to the config directory. Defaults to 'config/' relative
                       to the tutorial package root.
        """
        if config_dir is None:
            # Default: look for config relative to this file's parent (tutorial/)
            package_root = Path(__file__).parent.parent.parent
            config_dir = package_root / 'config'

        self.config_dir = Path(config_dir)
        self.providers_dir = self.config_dir / 'providers'
        self.environments_dir = self.config_dir / 'environments'

        # Validate directories exist
        if not self.config_dir.exists():
            raise FileNotFoundError(f"Config directory not found: {self.config_dir}")

    def _interpolate_env_vars(self, value: Any) -> Any:
        """
        Recursively interpolate environment variables in config values.

        Supports syntax: ${VAR_NAME} or ${VAR_NAME:-default_value}
        """
        if isinstance(value, str):
            def replace_var(match):
                var_name = match.group(1)
                default_value = match.group(2) or ''
                return os.environ.get(var_name, default_value)
            return self.ENV_VAR_PATTERN.sub(replace_var, value)
        elif isinstance(value, dict):
            return {k: self._interpolate_env_vars(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._interpolate_env_vars(v) for v in value]
        return value

    def _load_yaml(self, file_path: Path, interpolate: bool = True) -> Dict[str, Any]:
        """Load and parse a YAML file."""
        if not file_path.exists():
            raise FileNotFoundError(f"Config file not found: {file_path}")

        with open(file_path, 'r') as f:
            data = yaml.safe_load(f) or {}

        if interpolate:
            data = self._interpolate_env_vars(data)

        return data

    def load_provider(self, provider_name: str) -> ProviderConfig:
        """
        Load a single provider configuration.

        Args:
            provider_name: Name of the provider (e.g., 'pesi', 'camft')

        Returns:
            ProviderConfig dataclass with parsed configuration

        Raises:
            FileNotFoundError: If provider config file doesn't exist
            ValueError: If config validation fails
        """
        file_path = self.providers_dir / f"{provider_name}.yaml"
        data = self._load_yaml(file_path)

        return self._parse_provider_config(data, provider_name)

    def load_all_providers(self, active_only: bool = True) -> Dict[str, ProviderConfig]:
        """
        Load all provider configurations.

        Args:
            active_only: If True, only return providers with active=true

        Returns:
            Dict mapping provider names to ProviderConfig objects
        """
        providers = {}

        if not self.providers_dir.exists():
            return providers

        for file_path in self.providers_dir.glob('*.yaml'):
            # Skip template file
            if file_path.name.startswith('_'):
                continue

            try:
                provider_name = file_path.stem
                config = self.load_provider(provider_name)

                if active_only and not config.active:
                    continue

                providers[provider_name] = config
            except Exception as e:
                print(f"Warning: Failed to load provider {file_path.name}: {e}")

        return providers

    def load_environment(self, env_name: str = None) -> EnvironmentConfig:
        """
        Load environment configuration.

        Args:
            env_name: Environment name ('local', 'production').
                     If None, uses ENV environment variable or defaults to 'local'.

        Returns:
            EnvironmentConfig dataclass
        """
        if env_name is None:
            env_name = os.environ.get('ENV', 'local')

        file_path = self.environments_dir / f"{env_name}.yaml"
        data = self._load_yaml(file_path)

        return EnvironmentConfig(
            environment=data.get('environment', env_name),
            storage=data.get('storage', {}),
            crawl=data.get('crawl', {}),
            logging=data.get('logging', {}),
            output=data.get('output', {}),
            glue=data.get('glue', {}),
        )

    def _parse_provider_config(self, data: Dict[str, Any], provider_name: str) -> ProviderConfig:
        """Parse raw YAML data into a ProviderConfig object."""
        # Parse crawl config
        crawl_data = data.get('crawl', {})
        crawl_config = CrawlConfig(
            start_urls=crawl_data.get('start_urls', []),
            download_delay=crawl_data.get('download_delay', 5.0),
            randomize_download_delay=crawl_data.get('randomize_download_delay', True),
            concurrent_requests=crawl_data.get('concurrent_requests', 1),
            concurrent_requests_per_domain=crawl_data.get('concurrent_requests_per_domain', 1),
            depth_limit=crawl_data.get('depth_limit', 3),
            robotstxt_obey=crawl_data.get('robotstxt_obey', True),
            autothrottle=crawl_data.get('autothrottle', {}),
            patterns=crawl_data.get('patterns', {}),
        )

        # Parse selectors config
        selectors_data = data.get('selectors', {})
        selectors_config = SelectorsConfig(
            course_links=selectors_data.get('course_links', {}),
            pagination=selectors_data.get('pagination', {}),
        )

        return ProviderConfig(
            name=data.get('name', provider_name),
            display_name=data.get('display_name', provider_name),
            active=data.get('active', False),
            domains=data.get('domains', []),
            crawl=crawl_config,
            selectors=selectors_config,
            metadata=data.get('metadata', {}),
        )

    def list_providers(self) -> List[str]:
        """List all available provider names (excluding template)."""
        if not self.providers_dir.exists():
            return []

        return [
            f.stem for f in self.providers_dir.glob('*.yaml')
            if not f.name.startswith('_')
        ]

    def list_environments(self) -> List[str]:
        """List all available environment names."""
        if not self.environments_dir.exists():
            return []

        return [f.stem for f in self.environments_dir.glob('*.yaml')]

    def validate_provider(self, provider_name: str) -> List[str]:
        """
        Validate a provider configuration and return any errors.

        Args:
            provider_name: Name of the provider to validate

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        try:
            config = self.load_provider(provider_name)
        except FileNotFoundError:
            return [f"Provider config file not found: {provider_name}.yaml"]
        except Exception as e:
            return [f"Failed to parse config: {e}"]

        # Required fields
        if not config.crawl.start_urls:
            errors.append("Missing required field: crawl.start_urls")

        if not config.domains:
            errors.append("Missing required field: domains")

        # Validate URLs
        for url in config.crawl.start_urls:
            if not url.startswith(('http://', 'https://')):
                errors.append(f"Invalid start URL: {url}")

        # Validate patterns are lists
        for pattern_type in ['listing', 'course_detail', 'skip']:
            patterns = config.crawl.patterns.get(pattern_type, [])
            if not isinstance(patterns, list):
                errors.append(f"Pattern '{pattern_type}' must be a list")

        return errors
