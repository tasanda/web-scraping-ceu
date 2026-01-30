"""
Text Extraction and Normalization

Extracts clean text from HTML and performs normalization.
"""
import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
from dataclasses import dataclass


@dataclass
class ExtractedText:
    """Container for extracted text content"""
    title: Optional[str] = None
    description: Optional[str] = None
    full_text: str = ""
    meta_description: Optional[str] = None
    headings: List[str] = None
    structured_data: Dict = None

    def __post_init__(self):
        if self.headings is None:
            self.headings = []
        if self.structured_data is None:
            self.structured_data = {}


class TextExtractor:
    """
    Extracts and normalizes text from HTML content.
    """

    # Tags to remove completely (including content)
    REMOVE_TAGS = ['script', 'style', 'nav', 'footer', 'header', 'aside',
                   'noscript', 'iframe', 'svg', 'form']

    # Tags that typically contain important content
    CONTENT_TAGS = ['article', 'main', 'section', '.content', '.description',
                    '.course-content', '.product-description']

    def __init__(self):
        pass

    def extract(self, html: str) -> ExtractedText:
        """
        Extract structured text from HTML.

        Args:
            html: Raw HTML string

        Returns:
            ExtractedText object with extracted content
        """
        soup = BeautifulSoup(html, 'html.parser')

        # Remove unwanted tags
        for tag in self.REMOVE_TAGS:
            for element in soup.find_all(tag):
                element.decompose()

        result = ExtractedText()

        # Extract title
        result.title = self._extract_title(soup)

        # Extract meta description
        result.meta_description = self._extract_meta_description(soup)

        # Extract headings
        result.headings = self._extract_headings(soup)

        # Extract main description/content
        result.description = self._extract_description(soup)

        # Extract full normalized text
        result.full_text = self._normalize_text(soup.get_text(separator=' '))

        # Extract structured data (JSON-LD, microdata)
        result.structured_data = self._extract_structured_data(soup)

        return result

    def _extract_title(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract page title"""
        # Try h1 first
        h1 = soup.find('h1')
        if h1:
            return self._normalize_text(h1.get_text())

        # Try title tag
        title_tag = soup.find('title')
        if title_tag:
            title = title_tag.get_text()
            # Remove common suffixes like " | PESI"
            title = re.sub(r'\s*[\|–-]\s*[^|–-]+$', '', title)
            return self._normalize_text(title)

        # Try og:title
        og_title = soup.find('meta', {'property': 'og:title'})
        if og_title:
            return self._normalize_text(og_title.get('content', ''))

        return None

    def _extract_meta_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract meta description"""
        meta = soup.find('meta', {'name': 'description'})
        if meta:
            return self._normalize_text(meta.get('content', ''))

        og_desc = soup.find('meta', {'property': 'og:description'})
        if og_desc:
            return self._normalize_text(og_desc.get('content', ''))

        return None

    def _extract_headings(self, soup: BeautifulSoup) -> List[str]:
        """Extract all headings (h1-h6)"""
        headings = []
        for i in range(1, 7):
            for heading in soup.find_all(f'h{i}'):
                text = self._normalize_text(heading.get_text())
                if text and len(text) > 2:
                    headings.append(text)
        return headings

    def _extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract main description content"""
        # Try common description selectors
        selectors = [
            '.productDescription', '.product-description', '.description',
            '.course-description', '.overview', '.summary', '.about',
            '[itemprop="description"]', '.content p'
        ]

        for selector in selectors:
            elements = soup.select(selector)
            if elements:
                text_parts = []
                for el in elements[:3]:  # Limit to first 3 matches
                    text = self._normalize_text(el.get_text())
                    if text and len(text) > 20:
                        text_parts.append(text)
                if text_parts:
                    return ' '.join(text_parts)[:2000]  # Limit length

        # Fallback: get first substantial paragraph
        for p in soup.find_all('p'):
            text = self._normalize_text(p.get_text())
            if text and len(text) > 100:
                return text[:2000]

        return None

    def _extract_structured_data(self, soup: BeautifulSoup) -> Dict:
        """Extract JSON-LD structured data"""
        import json

        data = {}

        # Find JSON-LD scripts
        for script in soup.find_all('script', {'type': 'application/ld+json'}):
            try:
                json_data = json.loads(script.string)
                if isinstance(json_data, dict):
                    data_type = json_data.get('@type', 'unknown')
                    data[data_type] = json_data
                elif isinstance(json_data, list):
                    for item in json_data:
                        if isinstance(item, dict):
                            data_type = item.get('@type', 'unknown')
                            data[data_type] = item
            except (json.JSONDecodeError, TypeError):
                continue

        return data

    def _normalize_text(self, text: str) -> str:
        """
        Normalize text:
        - Unicode normalization
        - Collapse whitespace
        - Remove control characters
        - Strip
        """
        if not text:
            return ""

        # Unicode normalization (NFKC - compatibility decomposition, then composition)
        text = unicodedata.normalize('NFKC', text)

        # Remove control characters except newlines and tabs
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)

        # Collapse multiple whitespace (including newlines) into single space
        text = re.sub(r'\s+', ' ', text)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text

    def tokenize(self, text: str) -> List[str]:
        """
        Simple word tokenization.

        For more advanced tokenization, use spaCy in NLPProcessor.
        """
        # Simple word tokenization - split on non-word characters
        tokens = re.findall(r'\b\w+\b', text.lower())
        return tokens

    def extract_sentences(self, text: str) -> List[str]:
        """
        Extract sentences from text.

        For better sentence segmentation, use spaCy in NLPProcessor.
        """
        # Simple sentence splitting on common terminators
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]
