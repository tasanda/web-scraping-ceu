"""
Phase 2: NLP Processing Module

This module handles extraction of structured data from raw HTML content.
"""
from .text_extractor import TextExtractor
from .nlp_processor import NLPProcessor
from .ceu_patterns import CEUPatternExtractor
from .processor import CourseProcessor

__all__ = [
    'TextExtractor',
    'NLPProcessor',
    'CEUPatternExtractor',
    'CourseProcessor',
]
