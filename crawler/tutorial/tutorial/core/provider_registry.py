"""
Provider Registry - Central management of crawl providers.

The registry acts as a singleton that provides access to all configured
providers, handles provider lookup, and manages provider lifecycle.
"""

from typing import Dict, List, Optional, Any
from pathlib import Path
import threading

from .config_loader import ConfigLoader, ProviderConfig


class ProviderRegistry:
    """
    Central registry for managing crawl providers.

    This is a thread-safe singleton that caches provider configurations
    and provides easy access throughout the application.

    Usage:
        # Get the singleton instance
        registry = ProviderRegistry.instance()

        # Get a specific provider
        pesi = registry.get('pesi')

        # Get all active providers
        providers = registry.get_all()

        # Check if provider exists
        if registry.has('camft'):
            ...

        # Refresh configs from disk
        registry.refresh()
    """

    _instance: Optional['ProviderRegistry'] = None
    _lock = threading.Lock()

    def __init__(self, config_dir: Optional[Path] = None, auto_load: bool = True):
        """
        Initialize the registry.

        Args:
            config_dir: Path to config directory
            auto_load: If True, automatically load all providers on init
        """
        self._config_loader = ConfigLoader(config_dir)
        self._providers: Dict[str, ProviderConfig] = {}
        self._loaded = False

        if auto_load:
            self.refresh()

    @classmethod
    def instance(cls, config_dir: Optional[Path] = None) -> 'ProviderRegistry':
        """
        Get the singleton instance of the registry.

        Thread-safe lazy initialization.
        """
        if cls._instance is None:
            with cls._lock:
                # Double-check locking
                if cls._instance is None:
                    cls._instance = cls(config_dir)
        return cls._instance

    @classmethod
    def reset_instance(cls):
        """Reset the singleton instance (useful for testing)."""
        with cls._lock:
            cls._instance = None

    def refresh(self, active_only: bool = True) -> None:
        """
        Reload all provider configurations from disk.

        Args:
            active_only: If True, only load providers with active=true
        """
        self._providers = self._config_loader.load_all_providers(active_only=active_only)
        self._loaded = True

    def get(self, provider_name: str) -> Optional[ProviderConfig]:
        """
        Get a provider configuration by name.

        Args:
            provider_name: The provider name (e.g., 'pesi', 'camft')

        Returns:
            ProviderConfig if found, None otherwise
        """
        if not self._loaded:
            self.refresh()

        # First check cache
        if provider_name in self._providers:
            return self._providers[provider_name]

        # Try loading directly (might be inactive)
        try:
            config = self._config_loader.load_provider(provider_name)
            return config
        except FileNotFoundError:
            return None

    def get_or_raise(self, provider_name: str) -> ProviderConfig:
        """
        Get a provider configuration, raising an error if not found.

        Args:
            provider_name: The provider name

        Returns:
            ProviderConfig

        Raises:
            ValueError: If provider not found
        """
        config = self.get(provider_name)
        if config is None:
            available = ', '.join(self.list_providers())
            raise ValueError(
                f"Unknown provider: '{provider_name}'. "
                f"Available providers: {available or 'none'}"
            )
        return config

    def get_all(self, active_only: bool = True) -> Dict[str, ProviderConfig]:
        """
        Get all provider configurations.

        Args:
            active_only: If True, only return active providers

        Returns:
            Dict mapping provider names to configs
        """
        if not self._loaded:
            self.refresh(active_only=active_only)

        if active_only:
            return {k: v for k, v in self._providers.items() if v.active}
        return self._providers.copy()

    def has(self, provider_name: str) -> bool:
        """Check if a provider exists in the registry."""
        return self.get(provider_name) is not None

    def list_providers(self, active_only: bool = False) -> List[str]:
        """
        List all provider names.

        Args:
            active_only: If True, only list active providers

        Returns:
            List of provider names
        """
        if active_only:
            return list(self.get_all(active_only=True).keys())
        return self._config_loader.list_providers()

    def list_active(self) -> List[str]:
        """List only active provider names."""
        return self.list_providers(active_only=True)

    def get_legacy_format(self, provider_name: str) -> Optional[Dict[str, Any]]:
        """
        Get provider config in the legacy PROVIDERS dict format.

        This is for backwards compatibility with existing spider code.

        Args:
            provider_name: The provider name

        Returns:
            Dict in legacy format, or None if not found
        """
        config = self.get(provider_name)
        if config is None:
            return None
        return config.to_legacy_format()

    def get_all_legacy_format(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all providers in legacy PROVIDERS dict format.

        Returns:
            Dict mapping provider names to legacy format configs
        """
        return {
            name: config.to_legacy_format()
            for name, config in self.get_all().items()
        }

    def get_spider_settings(self, provider_name: str) -> Dict[str, Any]:
        """
        Get Scrapy spider custom_settings for a provider.

        Args:
            provider_name: The provider name

        Returns:
            Dict of Scrapy settings

        Raises:
            ValueError: If provider not found
        """
        config = self.get_or_raise(provider_name)
        return config.to_spider_settings()

    def validate(self, provider_name: str) -> List[str]:
        """
        Validate a provider configuration.

        Args:
            provider_name: The provider name

        Returns:
            List of error messages (empty if valid)
        """
        return self._config_loader.validate_provider(provider_name)

    def validate_all(self) -> Dict[str, List[str]]:
        """
        Validate all provider configurations.

        Returns:
            Dict mapping provider names to lists of errors
        """
        results = {}
        for provider_name in self.list_providers():
            errors = self.validate(provider_name)
            if errors:
                results[provider_name] = errors
        return results

    def summary(self) -> str:
        """
        Get a formatted summary of all providers.

        Returns:
            Multi-line string with provider information
        """
        lines = ["Registered Providers:"]
        lines.append("-" * 50)

        for name in sorted(self.list_providers()):
            config = self.get(name)
            if config:
                status = "active" if config.active else "inactive"
                lines.append(f"  {name}: {config.display_name} [{status}]")
                lines.append(f"    Base URL: {config.base_url}")
                lines.append(f"    Start URLs: {len(config.crawl.start_urls)}")
            else:
                lines.append(f"  {name}: (failed to load)")

        if not self.list_providers():
            lines.append("  (no providers configured)")

        return "\n".join(lines)

    def __contains__(self, provider_name: str) -> bool:
        """Support 'in' operator: 'pesi' in registry"""
        return self.has(provider_name)

    def __getitem__(self, provider_name: str) -> ProviderConfig:
        """Support dict-like access: registry['pesi']"""
        return self.get_or_raise(provider_name)

    def __iter__(self):
        """Support iteration over provider names."""
        return iter(self.list_providers(active_only=True))

    def __len__(self) -> int:
        """Return number of active providers."""
        return len(self.get_all(active_only=True))
