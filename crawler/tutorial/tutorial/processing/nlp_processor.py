"""
NLP Processor with spaCy

Uses spaCy for:
- Named Entity Recognition (dates, organizations, locations, money)
- Better tokenization and sentence segmentation
- Part-of-speech tagging for context-aware extraction
"""
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field as dataclass_field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Try to import spaCy - it's optional but recommended
try:
    import spacy
    from spacy.language import Language
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    logger.warning("spaCy not available. Install with: pip install spacy && python -m spacy download en_core_web_sm")


@dataclass
class ExtractedEntities:
    """Container for NER extraction results"""
    dates: List[Dict] = dataclass_field(default_factory=list)       # Dates found
    money: List[Dict] = dataclass_field(default_factory=list)       # Money/prices
    organizations: List[Dict] = dataclass_field(default_factory=list)  # Organizations
    locations: List[Dict] = dataclass_field(default_factory=list)   # Locations/places
    persons: List[Dict] = dataclass_field(default_factory=list)     # People (instructors)
    durations: List[Dict] = dataclass_field(default_factory=list)   # Time durations
    custom: Dict[str, List] = dataclass_field(default_factory=dict)  # Custom entities


class NLPProcessor:
    """
    NLP processing using spaCy for Named Entity Recognition.
    """

    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize the NLP processor.

        Args:
            model_name: spaCy model to use. Options:
                - en_core_web_sm: Small, fast (recommended for production)
                - en_core_web_md: Medium, includes word vectors
                - en_core_web_lg: Large, best accuracy
        """
        self.nlp = None
        self.model_name = model_name

        if SPACY_AVAILABLE:
            try:
                self.nlp = spacy.load(model_name)
                logger.info(f"Loaded spaCy model: {model_name}")
            except OSError:
                logger.warning(
                    f"spaCy model '{model_name}' not found. "
                    f"Install with: python -m spacy download {model_name}"
                )
        else:
            logger.warning("spaCy not available, using fallback extraction")

    def extract_entities(self, text: str) -> ExtractedEntities:
        """
        Extract named entities from text using spaCy.

        Args:
            text: Input text

        Returns:
            ExtractedEntities with categorized entities
        """
        result = ExtractedEntities()

        if not text:
            return result

        if self.nlp:
            result = self._extract_with_spacy(text)
        else:
            result = self._extract_with_fallback(text)

        # Add custom duration extraction (spaCy doesn't have a DURATION entity)
        result.durations = self._extract_durations(text)

        return result

    def _extract_with_spacy(self, text: str) -> ExtractedEntities:
        """Extract entities using spaCy NER"""
        result = ExtractedEntities()

        # Process text with spaCy
        doc = self.nlp(text)

        # Map spaCy entity types to our categories
        for ent in doc.ents:
            entity_info = {
                'text': ent.text,
                'label': ent.label_,
                'start': ent.start_char,
                'end': ent.end_char,
                'confidence': 0.8  # spaCy doesn't provide confidence, use default
            }

            if ent.label_ == 'DATE':
                # Try to parse the date
                parsed = self._parse_date(ent.text)
                entity_info['parsed'] = parsed
                result.dates.append(entity_info)

            elif ent.label_ == 'MONEY':
                # Try to parse the amount
                parsed = self._parse_money(ent.text)
                entity_info['parsed'] = parsed
                result.money.append(entity_info)

            elif ent.label_ == 'ORG':
                result.organizations.append(entity_info)

            elif ent.label_ in ('GPE', 'LOC', 'FAC'):  # Geo-political, Location, Facility
                result.locations.append(entity_info)

            elif ent.label_ == 'PERSON':
                result.persons.append(entity_info)

            elif ent.label_ == 'TIME':
                result.durations.append(entity_info)

        return result

    def _extract_with_fallback(self, text: str) -> ExtractedEntities:
        """Fallback extraction without spaCy using regex patterns"""
        result = ExtractedEntities()

        # Date patterns
        date_patterns = [
            # January 15, 2025
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
            # Jan 15, 2025
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}',
            # 01/15/2025 or 1/15/2025
            r'\d{1,2}/\d{1,2}/\d{4}',
            # 2025-01-15
            r'\d{4}-\d{2}-\d{2}',
        ]

        for pattern in date_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                result.dates.append({
                    'text': match.group(),
                    'label': 'DATE',
                    'start': match.start(),
                    'end': match.end(),
                    'parsed': self._parse_date(match.group()),
                    'confidence': 0.7
                })

        # Money patterns
        money_patterns = [
            r'\$[\d,]+\.?\d*',  # $199.99 or $1,299
            r'USD\s*[\d,]+\.?\d*',  # USD 199.99
        ]

        for pattern in money_patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                result.money.append({
                    'text': match.group(),
                    'label': 'MONEY',
                    'start': match.start(),
                    'end': match.end(),
                    'parsed': self._parse_money(match.group()),
                    'confidence': 0.9
                })

        return result

    def _extract_durations(self, text: str) -> List[Dict]:
        """Extract time durations from text"""
        durations = []

        # Duration patterns
        patterns = [
            # 6 hours, 6.5 hours, 6 hrs
            (r'(\d+\.?\d*)\s*(hours?|hrs?)\b', 'hours'),
            # 90 minutes, 90 mins
            (r'(\d+)\s*(minutes?|mins?)\b', 'minutes'),
            # 6 hour 30 minute format
            (r'(\d+)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?)', 'hours_minutes'),
            # 1 day, 2 days
            (r'(\d+)\s*(days?)\b', 'days'),
        ]

        for pattern, duration_type in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                duration_info = {
                    'text': match.group(),
                    'label': 'DURATION',
                    'start': match.start(),
                    'end': match.end(),
                    'type': duration_type,
                    'confidence': 0.85
                }

                # Parse to minutes
                if duration_type == 'hours':
                    duration_info['minutes'] = int(float(match.group(1)) * 60)
                elif duration_type == 'minutes':
                    duration_info['minutes'] = int(match.group(1))
                elif duration_type == 'hours_minutes':
                    duration_info['minutes'] = int(match.group(1)) * 60 + int(match.group(2))
                elif duration_type == 'days':
                    duration_info['minutes'] = int(match.group(1)) * 8 * 60  # Assume 8-hour day

                durations.append(duration_info)

        return durations

    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        if not date_str:
            return None

        # Try various formats
        formats = [
            '%B %d, %Y',      # January 15, 2025
            '%B %d %Y',       # January 15 2025
            '%b %d, %Y',      # Jan 15, 2025
            '%b. %d, %Y',     # Jan. 15, 2025
            '%m/%d/%Y',       # 01/15/2025
            '%Y-%m-%d',       # 2025-01-15
        ]

        # Clean the string
        date_str = date_str.strip()

        for fmt in formats:
            try:
                parsed = datetime.strptime(date_str, fmt)
                return parsed.isoformat()
            except ValueError:
                continue

        return None

    def _parse_money(self, money_str: str) -> Optional[float]:
        """Parse money string to float"""
        if not money_str:
            return None

        # Remove currency symbols and parse
        cleaned = re.sub(r'[^\d.,]', '', money_str)

        # Handle comma as thousand separator
        cleaned = cleaned.replace(',', '')

        try:
            return float(cleaned)
        except ValueError:
            return None

    def get_sentences(self, text: str) -> List[str]:
        """
        Get sentences using spaCy's sentence segmentation.
        Falls back to simple regex if spaCy not available.
        """
        if not text:
            return []

        if self.nlp:
            doc = self.nlp(text)
            return [sent.text.strip() for sent in doc.sents]
        else:
            # Fallback to simple sentence splitting
            sentences = re.split(r'(?<=[.!?])\s+', text)
            return [s.strip() for s in sentences if s.strip()]

    def get_tokens(self, text: str) -> List[Dict]:
        """
        Get tokens with POS tags using spaCy.
        Falls back to simple word tokenization if spaCy not available.
        """
        if not text:
            return []

        if self.nlp:
            doc = self.nlp(text)
            return [
                {
                    'text': token.text,
                    'lemma': token.lemma_,
                    'pos': token.pos_,
                    'tag': token.tag_,
                    'is_stop': token.is_stop,
                }
                for token in doc
            ]
        else:
            # Fallback to simple tokenization
            tokens = re.findall(r'\b\w+\b', text)
            return [{'text': t, 'lemma': t.lower()} for t in tokens]
