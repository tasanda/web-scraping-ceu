"""
Allow running the processing module directly:
    python -m tutorial.processing process --limit 50
"""
from .cli import main

if __name__ == '__main__':
    main()
