"""
Allow running the processing module directly:
    python -m ceu_crawler.processing process --limit 50
"""
from .cli import main

if __name__ == '__main__':
    main()
