from pathlib import Path

import scrapy
import time
from scrapy.utils.response import open_in_browser

# Alternative version with even more conservative settings
class ExtraPoliteSpider(scrapy.Spider):
    name = "extra_polite"
    
    start_urls = [
        # Free CEU resources (usually more open)
        "https://www.pesi.com",
        # "https://www.freece.com/",
        # "https://www.ceufast.com/",
        
        # University continuing education (often public)
        # "https://continuinged.uw.edu/",
        # "https://www.extension.harvard.edu/",
    ]
    
    custom_settings = {
        # Even longer delays
        'DOWNLOAD_DELAY': 10,
        'RANDOMIZE_DOWNLOAD_DELAY': 1,
        
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
        'AUTOTHROTTLE_DEBUG': True,  # Shows throttling info
        
        # Timeout settings
        'DOWNLOAD_TIMEOUT': 30,
        
        'LOG_LEVEL': 'INFO',
    }
    
    # def parse(self, response):
    #     self.logger.info(f'Extra polite crawl of {response.url}')
        
    #     # Create descriptive filename
    #     timestamp = time.strftime("%Y%m%d_%H%M%S")
    #     filename = f"ceu_{timestamp}.html"
        
    #     # Save response
    #     output_path = Path(filename)
    #     output_path.write_bytes(response.body)
        
    #     # Basic content analysis
    #     title = response.css('title::text').get()
    #     articles = response.css('article').getall()
        
    #     self.logger.info(f'Saved to {filename}')
    #     self.logger.info(f'Title: {title.strip() if title else "No title found"}')
    #     self.logger.info(f'Found {len(articles)} article elements')
        
    #     # Yield some basic data
    #     yield {
    #         'url': response.url,
    #         'title': title.strip() if title else None,
    #         'timestamp': timestamp,
    #         'content_length': len(response.body),
    #         'article_count': len(articles)
    #     }
    def parse(self, response):
        # Log the request to show politeness in action
        self.logger.info(f'Crawled {response.url} at {time.strftime("%H:%M:%S")}')
        
        # Save the full HTML for reference
        page_section = response.url.split("/")[-1].split("?")[0] or "homepage"
        timestamp = int(time.time())
        filename = f"ceu_page_{page_section}_{timestamp}.html"
        
        output_path = Path(filename)
        output_path.write_bytes(response.body)
        self.logger.info(f'Saved page to {filename} ({len(response.body)} bytes)')
        
        # Dispatch to appropriate extractor based on domain
        domain = response.url.split('/')[2]  # Extract domain
        extractor_method = self.get_extractor_for_domain(domain)
        
        # Use generator delegation for cleaner code
        if extractor_method:
            yield from extractor_method(response)
        else:
            self.logger.warning(f'No extractor found for domain: {domain}')
    

    def get_extractor_for_domain(self, domain):
        """Return the appropriate extraction method for each domain"""
        extractors = {
            'www.pesi.com': self.extract_pesi_courses,
            'www.pesi.com/find/?category=Mental%20Health': self.extract_find_pesi_courses,
            # 'www.freece.com': self.extract_freece_courses,
            # 'www.ceufast.com': self.extract_ceufast_courses,
            # 'continuinged.uw.edu': self.extract_uw_courses,
            # 'www.extension.harvard.edu': self.extract_harvard_courses,
        }
        return extractors.get(domain)

    def extract_find_pesi_courses(self, response):
        return

    def extract_pesi_courses(self, response):
        """Extract CEU course information from PESI website"""
        courses = response.css('.fcSlide .cardItem')
        self.logger.info(f'Found {len(courses)} CEU courses on PESI page')
        
        for course in courses:
            try:
                # Course title and link
                title_element = course.css('.name a')
                title = title_element.css('::text').get()
                course_url = title_element.css('::attr(href)').get()
                
                # Make relative URLs absolute
                if course_url and not course_url.startswith('http'):
                    course_url = response.urljoin(course_url)
                
                # Speakers/Instructors
                speakers = course.css('.speakers a::text').get()
                
                # Course image
                image_url = course.css('.imgCol img::attr(data-src)').get()
                if not image_url:
                    image_url = course.css('.imgCol img::attr(src)').get()
                
                # Additional info that might be present
                description = course.css('.description::text').get()
                # Price extraction - handle multiple HTML structures  
                price = course.css('.calcPrice::text').get() or course.css('.priceValue::text').get()
                original_price = course.css('.originalPrice::text').get()

                # If no original price found with .originalPrice, try looking for second .priceValue
                if not original_price:
                    all_price_values = course.css('.priceValue::text').getall()
                    if len(all_price_values) > 1:
                        original_price = all_price_values[1]

                date = course.css('.date::text').get()
                duration = course.css('.duration::text').get()
                credits = course.css('.credits::text').get()
                product_type = (course.css('.productType .item::text').get() or 
                    course.css('.productType span::text').get() or
                    course.css('.productType::text').get())
                
                if title:  # Only yield if we found a title
                    course_data = {
                        'title': title.strip() if title else None,
                        'url': course_url,
                        'instructors': speakers.strip() if speakers else None,
                        'image_url': image_url,
                        'description': description.strip() if description else None,
                        'price': price.strip() if price else None,
                        'original_price': original_price.strip() if original_price else None,
                        'date': date.strip() if date else None,
                        'duration': duration.strip() if duration else None,
                        'credits': credits.strip() if credits else None,
                        'product_type': product_type.strip() if product_type else None,
                        'source_url': response.url,
                        'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S'),
                        'provider': 'pesi'
                    }

                     # Follow the course URL to get detailed info
                     # can add this functionality later
                    # yield response.follow(
                    #     course_url,
                    #     callback=self.parse_pesi_course_detail,
                    #     meta={'course_data': course_data},  # Pass basic data to detail parser
                    #     dont_filter=True  # Allow following the same URL multiple times if needed
                    # )
                    
                    self.logger.info(f'Extracted PESI course: {title.strip()}')
                    yield course_data
                    
            except Exception as e:
                self.logger.error(f'Error extracting PESI course info: {e}')
                continue

    # def parse_pesi_course_detail(self, response):
    #     """Parse individual course detail page to extract additional information"""
        
    #     # Get the basic course data passed from listing page
    #     course_data = response.meta['course_data'].copy()
        
    #     try:
    #         self.logger.info(f'Parsing detail page: {response.url}')
            
    #         # Extract detailed information from course page
    #         # Credits/CEUs
    #         credits = response.css('.ceu-hours::text, .credits::text, [class*="credit"]::text').get()
    #         if not credits:
    #             # Try extracting from text content
    #             credits_match = re.search(r'(\d+\.?\d*)\s*(?:CEU|Credit|Hour)', response.text, re.IGNORECASE)
    #             credits = credits_match.group(1) if credits_match else None
            
    #         # Duration
    #         duration = response.css('.duration::text, [class*="duration"]::text').get()
    #         if not duration:
    #             # Try extracting from text content
    #             duration_match = re.search(r'(\d+\.?\d*)\s*(?:hour|hr|minute|min)', response.text, re.IGNORECASE)
    #             duration = duration_match.group(0) if duration_match else None
            
    #         # Course dates/schedule
    #         date = response.css('.date::text, .schedule::text, [class*="date"]::text').get()
            
    #         # Detailed description
    #         detailed_description = response.css('.course-description::text, .full-description::text, .content p::text').get()
    #         if not detailed_description:
    #             # Try getting multiple paragraphs
    #             desc_paragraphs = response.css('.course-content p::text, .description p::text').getall()
    #             detailed_description = ' '.join(desc_paragraphs) if desc_paragraphs else None
            
    #         # Learning objectives
    #         objectives = response.css('.objectives li::text, .learning-objectives li::text').getall()
            
    #         # Target audience
    #         audience = response.css('.target-audience::text, .audience::text').get()
            
    #         # Prerequisites
    #         prerequisites = response.css('.prerequisites::text, .requirements::text').get()
            
    #         # Category/Subject area
    #         category = response.css('.category::text, .subject::text, [class*="category"]::text').get()
            
    #         # Accreditation info
    #         accreditation = response.css('.accreditation::text, .accredited-by::text').getall()
            
    #         # Update course data with detailed information
    #         course_data.update({
    #             'credits': credits.strip() if credits else None,
    #             'duration': duration.strip() if duration else None,
    #             'date': date.strip() if date else None,
    #             'detailed_description': detailed_description.strip() if detailed_description else course_data.get('description'),
    #             'learning_objectives': objectives if objectives else None,
    #             'target_audience': audience.strip() if audience else None,
    #             'prerequisites': prerequisites.strip() if prerequisites else None,
    #             'category': category.strip() if category else None,
    #             'accreditation': accreditation if accreditation else None,
    #             'detail_page_scraped': True
    #         })
            
    #         self.logger.info(f'Successfully extracted detailed info for: {course_data["title"]}')
    #         yield course_data
            
    #     except Exception as e:
    #         self.logger.error(f'Error parsing course detail page {response.url}: {e}')
    #         # Still yield the basic data even if detail parsing fails
    #         course_data['detail_page_scraped'] = False
    #         course_data['detail_parsing_error'] = str(e)
    #         yield course_data