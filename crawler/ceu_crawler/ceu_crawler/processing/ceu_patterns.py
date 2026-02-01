"""
CEU-Specific Pattern Extraction

Specialized regex patterns and extraction logic for:
- CEU/CE credit values
- Accreditation information
- Course types
- Professional fields
- Pricing structures
"""
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field as dataclass_field
import logging

logger = logging.getLogger(__name__)


@dataclass
class CEUExtractionResult:
    """Container for CEU-specific extraction results"""
    # Credits
    credits: Optional[float] = None
    credits_string: Optional[str] = None
    credits_confidence: float = 0.0
    credit_type: Optional[str] = None  # "CE", "CEU", "clock hours", etc.

    # Accreditation
    accreditations: List[Dict] = dataclass_field(default_factory=list)

    # Pricing
    price: Optional[float] = None
    price_string: Optional[str] = None
    original_price: Optional[float] = None
    price_confidence: float = 0.0

    # Duration
    duration_minutes: Optional[int] = None
    duration_string: Optional[str] = None

    # Course type
    course_type: Optional[str] = None  # live_webinar, in_person, on_demand, self_paced
    course_type_confidence: float = 0.0

    # Professional field
    field: Optional[str] = None  # mental_health, nursing, etc.
    field_confidence: float = 0.0

    # Instructors
    instructors: List[str] = dataclass_field(default_factory=list)

    # Additional metadata
    extraction_methods: List[str] = dataclass_field(default_factory=list)


class CEUPatternExtractor:
    """
    Extracts CEU-specific information using pattern matching.
    """

    # =========================================================================
    # Credit Patterns - ordered by specificity/reliability
    # =========================================================================
    CREDIT_PATTERNS = [
        # High confidence patterns
        (r'(?:earn|receive|get)\s+(?:up\s+to\s+)?(\d+\.?\d*)\s*(?:CE|CEU|clock|contact)\s*hours?', 0.95, 'CE hours'),
        (r'(\d+\.?\d*)\s*(?:CE|CEU)\s*(?:credit|hour)s?\s*(?:available)?', 0.9, 'CE credits'),
        (r'(\d+\.?\d*)\s*continuing\s*education\s*(?:credit|hour|unit)s?', 0.9, 'CE'),
        (r'(?:CE|CEU)\s*(?:credit|hour)s?[:\s]+(\d+\.?\d*)', 0.85, 'CE'),

        # Medium confidence patterns
        (r'(\d+\.?\d*)\s*clock\s*hours?', 0.8, 'clock hours'),
        (r'(\d+\.?\d*)\s*contact\s*hours?', 0.8, 'contact hours'),
        (r'credit\s*hours?[:\s]+(\d+\.?\d*)', 0.75, 'credit hours'),
        (r'(\d+\.?\d*)\s*professional\s*development\s*(?:hour|unit)s?', 0.75, 'PD'),

        # Lower confidence patterns
        (r'(?:approved\s+for|offers?)\s+(\d+\.?\d*)\s*(?:CE|credit)', 0.7, 'CE'),
        (r'(\d+\.?\d*)\s*(?:CE|credit)s?\b', 0.6, 'CE'),
    ]

    # =========================================================================
    # Accreditation Patterns
    # =========================================================================
    ACCREDITATION_PATTERNS = [
        # Board/Organization approvals
        (r'(?:approved|accredited)\s+(?:by|through)\s+([A-Z][A-Za-z\s&]+(?:Board|Association|Council))', 'approval'),
        (r'([A-Z]{2,})\s+(?:approved|accredited|certified)', 'acronym'),

        # Specific accrediting bodies
        (r'(NASW|NBCC|APA|ASWB|BBS|BRN|CE4Less)', 'organization'),
        (r'(National Board for Certified Counselors)', 'organization'),
        (r'(American Psychological Association)', 'organization'),
        (r'(Board of Registered Nursing)', 'organization'),

        # State approvals
        (r'(?:approved\s+(?:in|for)|meets\s+requirements\s+(?:in|for))\s+([A-Z]{2}(?:,\s*[A-Z]{2})*)', 'states'),
    ]

    # =========================================================================
    # Course Type Indicators
    # =========================================================================
    COURSE_TYPE_PATTERNS = {
        'live_webinar': [
            (r'live\s+(?:webinar|online|virtual)', 0.95),
            (r'(?:join|attend)\s+(?:us\s+)?live', 0.9),
            (r'live\s+(?:event|training|seminar|workshop)', 0.9),
            (r'real[- ]?time\s+(?:webinar|training)', 0.85),
            (r'interactive\s+(?:webinar|session)', 0.8),
        ],
        'in_person': [
            (r'in[- ]?person\s+(?:event|training|seminar|workshop)', 0.95),
            (r'(?:on[- ]?site|face[- ]?to[- ]?face)', 0.9),
            (r'(?:attend|join)\s+(?:us\s+)?in\s+person', 0.9),
            (r'venue|location|conference\s+center', 0.7),
        ],
        'on_demand': [
            (r'on[- ]?demand', 0.95),
            (r'(?:watch|access|view)\s+(?:anytime|24\/7)', 0.9),
            (r'(?:recorded|pre[- ]?recorded)\s+(?:webinar|training)', 0.9),
            (r'instant\s+access', 0.85),
            (r'start\s+(?:immediately|anytime|now)', 0.8),
        ],
        'self_paced': [
            (r'self[- ]?paced', 0.95),
            (r'self[- ]?study', 0.9),
            (r'(?:learn|study|complete)\s+at\s+your\s+own\s+pace', 0.9),
            (r'home\s+study', 0.85),
            (r'independent\s+study', 0.8),
        ],
    }

    # =========================================================================
    # Professional Field Keywords
    # =========================================================================
    FIELD_KEYWORDS = {
        'mental_health': [
            'mental health', 'therapy', 'therapist', 'psychotherapy', 'counseling',
            'depression', 'anxiety', 'ptsd', 'trauma', 'addiction', 'substance abuse',
            'behavioral health', 'mental illness', 'psychiatric', 'adhd', 'autism',
            'clinical mental health', 'psychopathology', 'dbt', 'cbt', 'emdr'
        ],
        'psychology': [
            'psychology', 'psychologist', 'cognitive', 'neuropsychology',
            'psychological assessment', 'psychological testing', 'behavioral psychology',
            'clinical psychology', 'forensic psychology'
        ],
        'counseling': [
            'counselor', 'counseling', 'lmft', 'lpc', 'lmhc', 'family therapy',
            'marriage counseling', 'couples therapy', 'school counselor',
            'career counseling', 'rehabilitation counseling'
        ],
        'nursing': [
            'nursing', 'nurse', 'rn', 'bsn', 'lpn', 'aprn', 'nurse practitioner',
            'clinical nursing', 'nursing ce', 'nursing continuing education',
            'registered nurse', 'nursing practice'
        ],
        'social_work': [
            'social work', 'social worker', 'lsw', 'lcsw', 'licsw', 'msw',
            'clinical social work', 'child welfare', 'case management'
        ],
    }

    # =========================================================================
    # Price Patterns
    # =========================================================================
    PRICE_PATTERNS = [
        # Standard prices
        (r'(?:price|cost|fee)[:\s]*\$?([\d,]+\.?\d*)', 0.9),
        (r'\$([\d,]+\.?\d*)', 0.85),
        (r'([\d,]+\.?\d*)\s*(?:USD|dollars?)', 0.85),

        # Sale/discount prices
        (r'(?:sale|special|discount)\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)', 0.9),
        (r'(?:now|only|just)\s*\$?([\d,]+\.?\d*)', 0.8),

        # Original/regular prices (for comparison)
        (r'(?:regular|original|was)\s*(?:price)?[:\s]*\$?([\d,]+\.?\d*)', 0.9),
    ]

    def __init__(self):
        pass

    def extract(self, text: str, html_text: str = None) -> CEUExtractionResult:
        """
        Extract CEU-specific information from text.

        Args:
            text: Normalized text content
            html_text: Original HTML text (for structure-aware extraction)

        Returns:
            CEUExtractionResult with all extracted information
        """
        result = CEUExtractionResult()

        if not text:
            return result

        # Extract credits
        self._extract_credits(text, result)

        # Extract accreditations
        self._extract_accreditations(text, result)

        # Extract pricing
        self._extract_pricing(text, result)

        # Extract duration
        self._extract_duration(text, result)

        # Determine course type
        self._determine_course_type(text, result)

        # Determine professional field
        self._determine_field(text, result)

        return result

    def _extract_credits(self, text: str, result: CEUExtractionResult):
        """Extract credit information"""
        best_match = None
        best_confidence = 0

        for pattern, confidence, credit_type in self.CREDIT_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    value = float(match.group(1))
                    # Validate reasonable credit range (0.5 to 100)
                    if 0.5 <= value <= 100 and confidence > best_confidence:
                        best_match = (value, match.group(), credit_type)
                        best_confidence = confidence
                except (ValueError, IndexError):
                    continue

        if best_match:
            result.credits = best_match[0]
            result.credits_string = best_match[1]
            result.credit_type = best_match[2]
            result.credits_confidence = best_confidence
            result.extraction_methods.append(f'credits:pattern:{best_confidence:.2f}')

    def _extract_accreditations(self, text: str, result: CEUExtractionResult):
        """Extract accreditation information"""
        for pattern, acc_type in self.ACCREDITATION_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                accreditation = {
                    'text': match.group(1) if match.groups() else match.group(),
                    'type': acc_type,
                    'full_match': match.group(),
                }
                # Avoid duplicates
                if accreditation['text'] not in [a['text'] for a in result.accreditations]:
                    result.accreditations.append(accreditation)

        if result.accreditations:
            result.extraction_methods.append('accreditation:pattern')

    def _extract_pricing(self, text: str, result: CEUExtractionResult):
        """Extract price information"""
        prices_found = []

        for pattern, confidence in self.PRICE_PATTERNS:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    value_str = match.group(1).replace(',', '')
                    value = float(value_str)
                    # Validate reasonable price range ($0 to $10,000)
                    if 0 <= value <= 10000:
                        prices_found.append((value, match.group(), confidence))
                except (ValueError, IndexError):
                    continue

        if prices_found:
            # Sort by confidence, then by value (lower price = likely sale price)
            prices_found.sort(key=lambda x: (-x[2], x[0]))

            # First (highest confidence) is the main price
            result.price = prices_found[0][0]
            result.price_string = prices_found[0][1]
            result.price_confidence = prices_found[0][2]

            # Check for original/higher price
            for price, text_match, conf in prices_found[1:]:
                if price > result.price:
                    result.original_price = price
                    break

            result.extraction_methods.append(f'price:pattern:{result.price_confidence:.2f}')

    def _extract_duration(self, text: str, result: CEUExtractionResult):
        """Extract duration information"""
        duration_patterns = [
            # Hours and minutes
            (r'(\d+)\s*(?:hours?|hrs?)\s*(?:and\s*)?(\d+)\s*(?:minutes?|mins?)', 'hours_minutes'),
            # Just hours
            (r'(\d+\.?\d*)\s*(?:hours?|hrs?)', 'hours'),
            # Just minutes
            (r'(\d+)\s*(?:minutes?|mins?)', 'minutes'),
            # Days
            (r'(\d+)\s*(?:days?)', 'days'),
        ]

        for pattern, duration_type in duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    if duration_type == 'hours_minutes':
                        minutes = int(match.group(1)) * 60 + int(match.group(2))
                    elif duration_type == 'hours':
                        minutes = int(float(match.group(1)) * 60)
                    elif duration_type == 'minutes':
                        minutes = int(match.group(1))
                    elif duration_type == 'days':
                        minutes = int(match.group(1)) * 8 * 60  # 8-hour day

                    result.duration_minutes = minutes
                    result.duration_string = match.group()
                    result.extraction_methods.append('duration:pattern')
                    break
                except (ValueError, IndexError):
                    continue

    def _determine_course_type(self, text: str, result: CEUExtractionResult):
        """Determine course type based on text patterns"""
        text_lower = text.lower()
        type_scores = {}

        for course_type, patterns in self.COURSE_TYPE_PATTERNS.items():
            max_score = 0
            for pattern, confidence in patterns:
                if re.search(pattern, text_lower):
                    max_score = max(max_score, confidence)
            if max_score > 0:
                type_scores[course_type] = max_score

        if type_scores:
            # Get highest scoring type
            best_type = max(type_scores.items(), key=lambda x: x[1])
            result.course_type = best_type[0]
            result.course_type_confidence = best_type[1]
            result.extraction_methods.append(f'course_type:pattern:{best_type[1]:.2f}')
        else:
            # Default to on_demand
            result.course_type = 'on_demand'
            result.course_type_confidence = 0.5

    def _determine_field(self, text: str, result: CEUExtractionResult):
        """Determine professional field based on keywords"""
        text_lower = text.lower()
        field_scores = {}

        for field_name, keywords in self.FIELD_KEYWORDS.items():
            score = 0
            matches = 0
            for keyword in keywords:
                count = text_lower.count(keyword)
                if count > 0:
                    matches += 1
                    score += count

            if matches > 0:
                # Normalize score: more unique keyword matches = higher confidence
                confidence = min(0.95, 0.5 + (matches / len(keywords)) * 0.5)
                field_scores[field_name] = confidence

        if field_scores:
            best_field = max(field_scores.items(), key=lambda x: x[1])
            result.field = best_field[0]
            result.field_confidence = best_field[1]
            result.extraction_methods.append(f'field:keyword:{best_field[1]:.2f}')
        else:
            result.field = 'other'
            result.field_confidence = 0.5

    def extract_instructors(self, text: str, persons: List[Dict] = None) -> List[str]:
        """
        Extract instructor names from text.

        Args:
            text: Text content
            persons: List of PERSON entities from NLP processor

        Returns:
            List of instructor names
        """
        instructors = []

        # Use NER results if available
        if persons:
            for person in persons:
                name = person.get('text', '')
                if name and len(name) > 3:
                    instructors.append(name)

        # Also look for common patterns
        instructor_patterns = [
            r'(?:presented\s+by|instructor|faculty|speaker|taught\s+by)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            r'(?:Dr\.|PhD|LCSW|LMFT|LPC|MD)[,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]

        for pattern in instructor_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                name = match.group(1).strip()
                if name and name not in instructors:
                    instructors.append(name)

        return instructors[:5]  # Limit to 5 instructors
