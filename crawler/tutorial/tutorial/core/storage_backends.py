"""
Storage Backend Abstraction for flexible data storage.

Supports multiple storage backends:
- PostgresBackend: Store HTML and metadata in PostgreSQL (current default)
- S3Backend: Store HTML in S3 for AWS Glue compatibility
- HybridBackend: S3 for HTML, Postgres for metadata

Usage:
    from tutorial.core.storage_backends import get_storage_backend

    # Get backend from environment config
    backend = get_storage_backend()

    # Store an item
    backend.store(item)

    # Retrieve an item
    html = backend.retrieve(url)
"""

import os
import json
import hashlib
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

try:
    import boto3
    from botocore.exceptions import ClientError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


class StorageBackend(ABC):
    """
    Abstract base class for storage backends.

    All backends must implement these methods to provide
    consistent storage interface.
    """

    @abstractmethod
    def open(self):
        """Initialize the storage connection."""
        pass

    @abstractmethod
    def close(self):
        """Close the storage connection."""
        pass

    @abstractmethod
    def store(self, item: Dict[str, Any]) -> bool:
        """
        Store a crawled item.

        Args:
            item: Dict containing at minimum: url, html_content, provider

        Returns:
            True if stored successfully
        """
        pass

    @abstractmethod
    def retrieve(self, url: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a stored item by URL.

        Args:
            url: The URL of the stored item

        Returns:
            Item dict if found, None otherwise
        """
        pass

    @abstractmethod
    def exists(self, url: str) -> bool:
        """Check if a URL has already been stored."""
        pass

    @abstractmethod
    def list_pending(self, provider: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List items pending processing."""
        pass

    def __enter__(self):
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


class PostgresBackend(StorageBackend):
    """
    PostgreSQL storage backend.

    Stores both HTML content and metadata in PostgreSQL.
    This is the current default backend for local development.
    """

    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize Postgres backend.

        Args:
            config: Database configuration dict with host, port, database, user, password
        """
        if not HAS_POSTGRES:
            raise ImportError("psycopg2 required for PostgresBackend")

        self.config = config or {
            'host': os.environ.get('DB_HOST', 'localhost'),
            'port': int(os.environ.get('DB_PORT', 5432)),
            'database': os.environ.get('DB_NAME', 'ceu_db'),
            'user': os.environ.get('DB_USER', 'postgres'),
            'password': os.environ.get('DB_PASSWORD', 'postgres'),
        }
        self.connection = None
        self._provider_cache: Dict[str, str] = {}

    def open(self):
        """Open database connection."""
        self.connection = psycopg2.connect(**self.config)

    def close(self):
        """Close database connection."""
        if self.connection:
            self.connection.close()
            self.connection = None

    def store(self, item: Dict[str, Any]) -> bool:
        """Store item in RawCrawlData table."""
        if not self.connection:
            raise RuntimeError("Backend not opened. Call open() first.")

        provider_id = self._get_or_create_provider(item.get('provider', 'unknown'))

        with self.connection.cursor() as cursor:
            # Check if URL exists
            cursor.execute(
                'SELECT id FROM "RawCrawlData" WHERE url = %s',
                (item['url'],)
            )
            existing = cursor.fetchone()

            if existing:
                # Update existing record
                cursor.execute('''
                    UPDATE "RawCrawlData"
                    SET "htmlContent" = %s,
                        "httpStatus" = %s,
                        "contentType" = %s,
                        "crawledAt" = %s,
                        "status" = 'pending',
                        "sourceUrl" = %s,
                        "pageType" = %s
                    WHERE id = %s
                ''', (
                    item.get('html_content', ''),
                    item.get('http_status', 200),
                    item.get('content_type', 'text/html'),
                    datetime.utcnow(),
                    item.get('source_url'),
                    item.get('page_type', 'unknown'),
                    existing[0]
                ))
            else:
                # Insert new record
                cursor.execute('''
                    INSERT INTO "RawCrawlData"
                    (id, url, "providerId", "htmlContent", "httpStatus",
                     "contentType", "crawledAt", "status", "sourceUrl", "pageType")
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, 'pending', %s, %s)
                ''', (
                    item['url'],
                    provider_id,
                    item.get('html_content', ''),
                    item.get('http_status', 200),
                    item.get('content_type', 'text/html'),
                    datetime.utcnow(),
                    item.get('source_url'),
                    item.get('page_type', 'unknown')
                ))

            self.connection.commit()
            return True

    def retrieve(self, url: str) -> Optional[Dict[str, Any]]:
        """Retrieve item by URL."""
        if not self.connection:
            raise RuntimeError("Backend not opened")

        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                'SELECT * FROM "RawCrawlData" WHERE url = %s',
                (url,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None

    def exists(self, url: str) -> bool:
        """Check if URL exists."""
        if not self.connection:
            raise RuntimeError("Backend not opened")

        with self.connection.cursor() as cursor:
            cursor.execute(
                'SELECT 1 FROM "RawCrawlData" WHERE url = %s LIMIT 1',
                (url,)
            )
            return cursor.fetchone() is not None

    def list_pending(self, provider: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List items pending processing."""
        if not self.connection:
            raise RuntimeError("Backend not opened")

        with self.connection.cursor(cursor_factory=RealDictCursor) as cursor:
            if provider:
                provider_id = self._get_provider_id(provider)
                if not provider_id:
                    return []
                cursor.execute('''
                    SELECT * FROM "RawCrawlData"
                    WHERE status = 'pending' AND "providerId" = %s
                    ORDER BY "crawledAt" DESC
                    LIMIT %s
                ''', (provider_id, limit))
            else:
                cursor.execute('''
                    SELECT * FROM "RawCrawlData"
                    WHERE status = 'pending'
                    ORDER BY "crawledAt" DESC
                    LIMIT %s
                ''', (limit,))

            return [dict(row) for row in cursor.fetchall()]

    def _get_or_create_provider(self, name: str) -> str:
        """Get or create provider, return ID."""
        if name in self._provider_cache:
            return self._provider_cache[name]

        with self.connection.cursor() as cursor:
            cursor.execute(
                'SELECT id FROM "CeuProvider" WHERE name = %s',
                (name,)
            )
            row = cursor.fetchone()

            if row:
                provider_id = row[0]
            else:
                cursor.execute('''
                    INSERT INTO "CeuProvider" (id, name, "baseUrl", active, "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), %s, %s, true, NOW(), NOW())
                    RETURNING id
                ''', (name, f'https://www.{name}.com'))
                provider_id = cursor.fetchone()[0]
                self.connection.commit()

            self._provider_cache[name] = provider_id
            return provider_id

    def _get_provider_id(self, name: str) -> Optional[str]:
        """Get provider ID by name."""
        with self.connection.cursor() as cursor:
            cursor.execute(
                'SELECT id FROM "CeuProvider" WHERE name = %s',
                (name,)
            )
            row = cursor.fetchone()
            return row[0] if row else None


class S3Backend(StorageBackend):
    """
    AWS S3 storage backend.

    Stores HTML content in S3 with metadata as JSON.
    Designed for AWS Glue compatibility.
    """

    def __init__(self, config: Dict[str, Any] = None):
        """
        Initialize S3 backend.

        Args:
            config: S3 configuration with bucket, prefix, region
        """
        if not HAS_BOTO3:
            raise ImportError("boto3 required for S3Backend")

        self.config = config or {
            'bucket': os.environ.get('S3_BUCKET', 'ceu-crawler'),
            'prefix': os.environ.get('S3_PREFIX', 'raw_html/'),
            'region': os.environ.get('AWS_REGION', 'us-east-1'),
        }
        self.s3_client = None

    def open(self):
        """Initialize S3 client."""
        self.s3_client = boto3.client('s3', region_name=self.config['region'])

    def close(self):
        """Close S3 client (no-op for boto3)."""
        self.s3_client = None

    def _url_to_key(self, url: str) -> str:
        """Convert URL to S3 key."""
        url_hash = hashlib.md5(url.encode()).hexdigest()
        return f"{self.config['prefix']}{url_hash}.json"

    def store(self, item: Dict[str, Any]) -> bool:
        """Store item in S3 as JSON."""
        if not self.s3_client:
            raise RuntimeError("Backend not opened")

        key = self._url_to_key(item['url'])

        # Prepare item for JSON serialization
        data = {
            'url': item['url'],
            'html_content': item.get('html_content', ''),
            'http_status': item.get('http_status', 200),
            'content_type': item.get('content_type', 'text/html'),
            'provider': item.get('provider', 'unknown'),
            'page_type': item.get('page_type', 'unknown'),
            'source_url': item.get('source_url'),
            'crawled_at': item.get('crawled_at', datetime.utcnow().isoformat()),
            'content_hash': item.get('content_hash', ''),
            'status': 'pending',
        }

        self.s3_client.put_object(
            Bucket=self.config['bucket'],
            Key=key,
            Body=json.dumps(data),
            ContentType='application/json',
        )
        return True

    def retrieve(self, url: str) -> Optional[Dict[str, Any]]:
        """Retrieve item from S3."""
        if not self.s3_client:
            raise RuntimeError("Backend not opened")

        key = self._url_to_key(url)

        try:
            response = self.s3_client.get_object(
                Bucket=self.config['bucket'],
                Key=key
            )
            return json.loads(response['Body'].read().decode('utf-8'))
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return None
            raise

    def exists(self, url: str) -> bool:
        """Check if URL exists in S3."""
        if not self.s3_client:
            raise RuntimeError("Backend not opened")

        key = self._url_to_key(url)

        try:
            self.s3_client.head_object(
                Bucket=self.config['bucket'],
                Key=key
            )
            return True
        except ClientError:
            return False

    def list_pending(self, provider: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List pending items from S3."""
        if not self.s3_client:
            raise RuntimeError("Backend not opened")

        items = []
        paginator = self.s3_client.get_paginator('list_objects_v2')

        for page in paginator.paginate(
            Bucket=self.config['bucket'],
            Prefix=self.config['prefix'],
            MaxKeys=limit
        ):
            for obj in page.get('Contents', []):
                try:
                    response = self.s3_client.get_object(
                        Bucket=self.config['bucket'],
                        Key=obj['Key']
                    )
                    data = json.loads(response['Body'].read().decode('utf-8'))

                    if data.get('status') == 'pending':
                        if provider and data.get('provider') != provider:
                            continue
                        items.append(data)

                        if len(items) >= limit:
                            return items
                except Exception:
                    continue

        return items


class HybridBackend(StorageBackend):
    """
    Hybrid storage backend.

    Stores HTML content in S3 and metadata in PostgreSQL.
    Best of both worlds for AWS Glue migration.
    """

    def __init__(self, postgres_config: Dict[str, Any] = None, s3_config: Dict[str, Any] = None):
        """
        Initialize hybrid backend.

        Args:
            postgres_config: PostgreSQL configuration
            s3_config: S3 configuration
        """
        self.postgres = PostgresBackend(postgres_config)
        self.s3 = S3Backend(s3_config)

    def open(self):
        """Open both backends."""
        self.postgres.open()
        self.s3.open()

    def close(self):
        """Close both backends."""
        self.postgres.close()
        self.s3.close()

    def store(self, item: Dict[str, Any]) -> bool:
        """Store HTML in S3, metadata in Postgres."""
        # Store full item in S3
        self.s3.store(item)

        # Store metadata (without HTML) in Postgres
        metadata_item = item.copy()
        metadata_item['html_content'] = ''  # Don't duplicate HTML
        metadata_item['s3_key'] = self.s3._url_to_key(item['url'])

        return self.postgres.store(metadata_item)

    def retrieve(self, url: str) -> Optional[Dict[str, Any]]:
        """Retrieve from S3 (has full content)."""
        return self.s3.retrieve(url)

    def exists(self, url: str) -> bool:
        """Check Postgres (faster than S3)."""
        return self.postgres.exists(url)

    def list_pending(self, provider: str = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List from Postgres, enrich with S3 content if needed."""
        return self.postgres.list_pending(provider, limit)


def get_storage_backend(env_config: Dict[str, Any] = None) -> StorageBackend:
    """
    Factory function to get the appropriate storage backend.

    Args:
        env_config: Environment configuration dict

    Returns:
        Configured StorageBackend instance
    """
    if env_config is None:
        # Default to Postgres for local development
        return PostgresBackend()

    storage_config = env_config.get('storage', {})
    backend_type = storage_config.get('backend', 'postgres')

    if backend_type == 'postgres':
        return PostgresBackend(storage_config.get('postgres'))
    elif backend_type == 's3':
        return S3Backend(storage_config.get('s3'))
    elif backend_type == 'hybrid':
        return HybridBackend(
            postgres_config=storage_config.get('postgres'),
            s3_config=storage_config.get('s3')
        )
    else:
        raise ValueError(f"Unknown storage backend: {backend_type}")
