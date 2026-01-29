from pathlib import Path
import scrapy
import time
import re
from datetime import datetime
from scrapy.utils.response import open_in_browser


class PesiSpider(scrapy.Spider):
    name = "pesi"
    
    # Start with course listing pages that have filters
    start_urls = [
        # Start with the homepage which has featured courses
        "https://www.pesi.com/",
    ]
    
    custom_settings = {
        # Conservative politeness settings
        'DOWNLOAD_DELAY': 10,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        
        # Maximum politeness
        'CONCURRENT_REQUESTS': 1,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
        
        # Respect all politeness protocols
        'ROBOTSTXT_OBEY': True,
        
        # Professional User-Agent
        'USER_AGENT': 'Mozilla/5.0 (compatible; PoliteBot/1.0; Educational Testing)',
        
        # Conservative AutoThrottle
        'AUTOTHROTTLE_ENABLED': True,
        'AUTOTHROTTLE_START_DELAY': 3,
        'AUTOTHROTTLE_MAX_DELAY': 15,
        'AUTOTHROTTLE_TARGET_CONCURRENCY': 0.5,
        'AUTOTHROTTLE_DEBUG': True,
        
        # Timeout settings
        'DOWNLOAD_TIMEOUT': 30,
        
        'LOG_LEVEL': 'INFO',

        # Limit depth to avoid crawling entire site
        'DEPTH_LIMIT': 2,
    }

    # Course type detection patterns
    LIVE_PATTERNS = [
        r'live\s*webinar', r'live\s*activity', r'in-person', r'in\s*person',
        r'register\s*for\s*this\s*live', r'live\s*seminar', r'live\s*workshop',
        r'live\s*event', r'live\s*training', r'attend\s*live'
    ]

    ON_DEMAND_PATTERNS = [
        r'self[- ]?paced', r'self[- ]?study', r'anytime\s*access', r'on[- ]?demand',
        r'instant\s*access', r'watch\s*anytime', r'start\s*immediately',
        r'available\s*now', r'recorded', r'home\s*study'
    ]

    def extract_course_type(self, response, title, description, category):
        """Detect course type from page content"""
        # Combine all text to search
        page_text = ' '.join([
            title or '',
            description or '',
            category or '',
            ' '.join(response.css('body::text').getall()[:50])  # First 50 text nodes
        ]).lower()

        # Check for live patterns
        for pattern in self.LIVE_PATTERNS:
            if re.search(pattern, page_text, re.IGNORECASE):
                # Check if it's specifically in-person
                if re.search(r'in[- ]?person', page_text, re.IGNORECASE):
                    return 'in_person'
                return 'live_webinar'

        # Check for on-demand patterns
        for pattern in self.ON_DEMAND_PATTERNS:
            if re.search(pattern, page_text, re.IGNORECASE):
                # Check if it's specifically self-paced
                if re.search(r'self[- ]?paced', page_text, re.IGNORECASE):
                    return 'self_paced'
                return 'on_demand'

        # Default to on_demand
        return 'on_demand'

    def extract_dates(self, response, date_str):
        """Extract and parse dates from page content

        Returns dict with start_date, end_date, registration_deadline
        """
        dates = {
            'start_date': None,
            'end_date': None,
            'registration_deadline': None
        }

        # Common date patterns
        date_patterns = [
            # January 15, 2025
            r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})',
            # 01/15/2025 or 1/15/2025
            r'(\d{1,2})/(\d{1,2})/(\d{4})',
            # 2025-01-15
            r'(\d{4})-(\d{2})-(\d{2})',
        ]

        # Get text from response for date searching
        page_text = ' '.join(response.css('body::text').getall()[:100])

        # Look for event date indicators
        event_date_indicators = response.css('.date::text, .eventDate::text, .start-date::text').getall()
        deadline_indicators = response.css('.deadline::text, .registration-deadline::text').getall()

        def parse_date_string(text):
            """Parse a date string into datetime"""
            if not text:
                return None

            # Try different formats
            formats = [
                '%B %d, %Y',      # January 15, 2025
                '%B %d %Y',       # January 15 2025
                '%m/%d/%Y',       # 01/15/2025
                '%Y-%m-%d',       # 2025-01-15
                '%b %d, %Y',      # Jan 15, 2025
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(text.strip(), fmt)
                except ValueError:
                    continue
            return None

        # Extract from date_str if provided
        if date_str:
            parsed = parse_date_string(date_str)
            if parsed:
                dates['start_date'] = parsed.isoformat()

        # Look for registration deadline
        for text in deadline_indicators:
            # Look for deadline pattern
            deadline_match = re.search(r'(register|deadline|expires?)\s*(?:by|before|:)?\s*(.+)', text, re.IGNORECASE)
            if deadline_match:
                parsed = parse_date_string(deadline_match.group(2))
                if parsed:
                    dates['registration_deadline'] = parsed.isoformat()
                    break

        # Look for date range (start - end)
        range_pattern = r'(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\s*[-–—]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})'
        range_match = re.search(range_pattern, page_text, re.IGNORECASE)
        if range_match:
            start_str = f"{range_match.group(1)} {range_match.group(2)}, {range_match.group(3)}"
            end_str = f"{range_match.group(4)} {range_match.group(5)}, {range_match.group(6)}"
            dates['start_date'] = parse_date_string(start_str).isoformat() if parse_date_string(start_str) else None
            dates['end_date'] = parse_date_string(end_str).isoformat() if parse_date_string(end_str) else None

        return dates

    def parse_price(self, price_str):
        """Convert price string to numeric value (cents)

        Returns tuple of (numeric_price, original_string)
        """
        if not price_str:
            return None, None

        original = price_str.strip()

        # Remove currency symbols and extract number
        # Handle formats: $199.99, $1,299.00, $199, etc.
        match = re.search(r'\$?\s*([\d,]+)\.?(\d{2})?', price_str)
        if match:
            dollars = match.group(1).replace(',', '')
            cents = match.group(2) or '00'
            try:
                numeric = float(f"{dollars}.{cents}")
                return numeric, original
            except ValueError:
                pass

        return None, original

    def parse_credits(self, credits_str):
        """Convert credits string to numeric value

        Returns tuple of (numeric_credits, original_string)
        """
        if not credits_str:
            return None, None

        original = credits_str.strip()

        # Extract number from patterns like "6.0", "6.0 CE hours", "6 credits"
        match = re.search(r'(\d+\.?\d*)', credits_str)
        if match:
            try:
                numeric = float(match.group(1))
                return numeric, original
            except ValueError:
                pass

        return None, original

    def parse_duration_minutes(self, duration_str):
        """Convert duration string to minutes

        Returns tuple of (minutes, original_string)
        """
        if not duration_str:
            return None, None

        original = duration_str.strip()
        total_minutes = 0

        # Handle hours and minutes patterns
        # "6 hours", "6h", "6 hrs", "360 minutes", "6 hours 30 minutes"

        # Extract hours
        hours_match = re.search(r'(\d+\.?\d*)\s*(?:hours?|hrs?|h\b)', duration_str, re.IGNORECASE)
        if hours_match:
            total_minutes += float(hours_match.group(1)) * 60

        # Extract minutes
        minutes_match = re.search(r'(\d+)\s*(?:minutes?|mins?|m\b)', duration_str, re.IGNORECASE)
        if minutes_match:
            total_minutes += int(minutes_match.group(1))

        # If no specific time unit found but has a number, assume hours
        if total_minutes == 0:
            simple_match = re.search(r'(\d+\.?\d*)', duration_str)
            if simple_match:
                total_minutes = float(simple_match.group(1)) * 60

        if total_minutes > 0:
            return int(total_minutes), original

        return None, original

    def parse(self, response):
        """Main parse method - handles course listing pages"""
        self.logger.info(f'Crawled {response.url} at {time.strftime("%H:%M:%S")}')
        
        # Extract course cards from the homepage sliders
        # Based on actual HTML: .fcSlide .cardItem
        course_cards = response.css('.fcSlide .cardItem')
        self.logger.info(f'Found {len(course_cards)} course cards on page')
        
        # Follow links to individual course detail pages
        for card in course_cards:
            # The link is inside .name a
            course_link = card.css('.name a::attr(href)').get()
            
            if course_link:
                # Make absolute URL
                course_url = response.urljoin(course_link)
                
                # Extract basic info from card for reference
                title = card.css('.name a::text').get()
                
                self.logger.info(f'Following course link: {title}')
                yield scrapy.Request(
                    course_url,
                    callback=self.parse_course_detail,
                    meta={'listing_url': response.url, 'title': title}
                )
        
        # Note: Homepage doesn't have pagination, but if crawling search results, add pagination here
    
    def parse_course_detail(self, response):
        """Parse individual course detail page to extract complete information"""
        self.logger.info(f'Parsing course detail: {response.url}')
        
        try:
            # Course title
            title = (
                response.css('h1::text').get() or
                response.meta.get('title', '')
            )
            
            if not title:
                self.logger.warning(f'No title found for {response.url}')
                return
            
            # Instructors/Speakers - they're often in specific areas
            instructors = response.css('.presenter::text, .speaker::text, .instructor::text, .faculty::text').getall()
            instructors_str = ', '.join([i.strip() for i in instructors if i.strip()])
            
            # Description - get the main course description
            description_parts = response.css('.productDescription *::text, .description *::text, .overview *::text').getall()
            description = ' '.join([d.strip() for d in description_parts if d.strip()])[:500]  # Limit to 500 chars
            
            # CEU Credits - CRITICAL: Multiple possible locations
            # PESI often shows this in a "CE Information" section or modal
            # Look for text containing CE, CEU, Credits, Hours
            # CEU Credits - Look for patterns like "6.0 CE hours" or "6.0 clock hours"
            credits = (
                # First try: "Earn up to X.X CE hours" pattern
                response.xpath('//p[contains(text(), "Earn up to")]/text()').re_first(r'(\d+\.?\d*)\s*CE\s*hours') or
                # Second try: "X.X continuing education" patterns
                response.xpath('//text()').re_first(r'(\d+\.?\d*)\s*(?:CE\s*hours|clock\s*hours|continuing\s*education)') or
                # Third try: Look in dataEntity divs (the CE info sections)
                response.css('.dataEntity p::text').re_first(r'(\d+\.?\d*)\s*(?:CE|clock|continuing)') or
                # Last resort: any number followed by CE/credit keywords
                response.xpath('//text()').re_first(r'(\d+\.?\d*)\s*(?:CE|CEU|Credit)')
            )
                        
            # Price information
            price = (
                response.css('.price::text, .priceValue::text, .calcPrice::text').get() or
                response.css('[class*="price"]::text').re_first(r'\$[\d,]+\.?\d*')
            )
            
            original_price = response.css('.originalPrice::text, .regular-price::text').get()
            
            # Course image
            image_url = (
                response.css('img[class*="product"]::attr(src), img[class*="course"]::attr(src)').get() or
                response.css('meta[property="og:image"]::attr(content)').get()
            )
            
            # Date/Duration
            date = response.css('.date::text, .start-date::text, .eventDate::text').get()
            duration = response.css('.duration::text, .length::text, .hours::text').get()
            
            # Category/Product Type
            category = (
                response.css('.productType::text, .category::text, .type::text').get() or
                'Online Course'
            )
            
            # Determine field
            field = self.categorize_field(title, description, category)
            
            # Parse numeric values
            price_numeric, price_string = self.parse_price(price)
            original_price_numeric, original_price_string = self.parse_price(original_price)
            credits_numeric, credits_string = self.parse_credits(credits)
            duration_minutes, duration_string = self.parse_duration_minutes(duration)

            # Extract course type
            course_type = self.extract_course_type(response, title, description, category)

            # Extract dates
            dates = self.extract_dates(response, date.strip() if date else None)

            # Build course data
            course_data = {
                'title': title.strip() if title else None,
                'url': response.url,
                'instructors': instructors_str if instructors_str else None,
                'image_url': response.urljoin(image_url) if image_url else None,
                'description': description.strip() if description else None,
                # Numeric values for database
                'price': price_numeric,
                'original_price': original_price_numeric,
                'credits': credits_numeric,
                'duration': duration_minutes,
                # Keep original strings for display
                'price_string': price_string,
                'original_price_string': original_price_string,
                'credits_string': credits_string,
                'duration_string': duration_string,
                # Course type and dates
                'course_type': course_type,
                'start_date': dates['start_date'],
                'end_date': dates['end_date'],
                'registration_deadline': dates['registration_deadline'],
                # Other fields
                'date': date.strip() if date else None,
                'category': category.strip() if category else None,
                'field': field,
                'source_url': response.meta.get('listing_url'),
                'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                'provider': 'pesi'
            }
            
            # Log what we found
            credits_found = f"Credits: {credits}" if credits else "NO CREDITS FOUND"
            self.logger.info(f'✓ Extracted: {title.strip()[:50]}... ({credits_found})')
            yield course_data
            
        except Exception as e:
            self.logger.error(f'Error parsing course detail {response.url}: {e}')
    
    def categorize_field(self, title, description, category):
        """Categorize course into field based on keywords"""
        if not title:
            return 'other'
        
        text_to_check = f"{title} {description or ''} {category or ''}".lower()
        
        # Mental health keywords
        mental_health_keywords = [
            'mental health', 'therapy', 'therapist', 'psychotherapy', 'counseling',
            'depression', 'anxiety', 'ptsd', 'trauma', 'addiction', 'substance abuse',
            'behavioral health', 'mental illness', 'psychiatric', 'adhd', 'autism'
        ]
        
        # Psychology keywords
        psychology_keywords = [
            'psychology', 'psychologist', 'cognitive', 'behavioral', 'neuropsychology',
            'psychological assessment', 'psychological testing'
        ]
        
        # Counseling keywords
        counseling_keywords = [
            'counselor', 'counseling', 'lmft', 'lpc', 'lmhc', 'family therapy',
            'marriage counseling', 'couples therapy'
        ]
        
        # Nursing keywords
        nursing_keywords = [
            'nursing', 'nurse', 'rn', 'bsn', 'nurse practitioner', 'clinical nursing',
            'nursing ce', 'nursing continuing education'
        ]
        
        # Social work keywords
        social_work_keywords = [
            'social work', 'social worker', 'lsw', 'lcsw', 'licsw'
        ]
        
        # Check for matches
        if any(keyword in text_to_check for keyword in mental_health_keywords):
            return 'mental_health'
        elif any(keyword in text_to_check for keyword in psychology_keywords):
            return 'psychology'
        elif any(keyword in text_to_check for keyword in counseling_keywords):
            return 'counseling'
        elif any(keyword in text_to_check for keyword in nursing_keywords):
            return 'nursing'
        elif any(keyword in text_to_check for keyword in social_work_keywords):
            return 'social_work'
        else:
            return 'other'