from pathlib import Path
import scrapy
import time
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
            
            # Build course data
            course_data = {
                'title': title.strip() if title else None,
                'url': response.url,
                'instructors': instructors_str if instructors_str else None,
                'image_url': response.urljoin(image_url) if image_url else None,
                'description': description.strip() if description else None,
                'price': price.strip() if price else None,
                'original_price': original_price.strip() if original_price else None,
                'date': date.strip() if date else None,
                'duration': duration.strip() if duration else None,
                'credits': credits.strip() if credits else None,
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