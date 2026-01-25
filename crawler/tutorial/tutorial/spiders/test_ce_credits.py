import scrapy
from scrapy.crawler import CrawlerProcess

class TestCESpider(scrapy.Spider):
    name = "test_ce"
    start_urls = ["https://www.pesi.com/item/changing-adhd-brain-moving-medication-138948"]
    
    custom_settings = {
        'ROBOTSTXT_OBEY': True,
        'USER_AGENT': 'Mozilla/5.0 (compatible; TestBot/1.0)',
        'LOG_LEVEL': 'INFO',
    }
    
    def parse(self, response):
        print("\n" + "="*80)
        print("SEARCHING FOR CE CREDITS")
        print("="*80)
        
        # 1. Look for any text containing CE, Credit, CEU, Hour
        print("\n1. All text containing CE/Credit/CEU/Hour:")
        ce_texts = response.xpath('//text()').re(r'.*(?:\d+\.?\d*)\s*(?:CE|Credit|CEU|Hour).*')
        for text in ce_texts[:10]:
            print(f"   {text.strip()}")
        
        # 2. Look in specific common locations
        print("\n2. Common credit locations:")
        locations = [
            ('.ce-credits', 'Class: ce-credits'),
            ('.credits', 'Class: credits'),
            ('[class*="credit"]', 'Any class with "credit"'),
            ('[data-credits]', 'Data attribute: credits'),
            ('.productDetails', 'Product details section'),
        ]
        
        for selector, desc in locations:
            result = response.css(f'{selector}::text').getall()
            if result:
                print(f"   ✓ {desc}: {result}")
        
        # 3. Search entire HTML for CE patterns
        print("\n3. Regex search for CE patterns:")
        patterns = [
            (r'(\d+\.?\d*)\s*CE\s*Credits?', 'X.X CE Credit(s)'),
            (r'(\d+\.?\d*)\s*CEU', 'X.X CEU'),
            (r'(\d+\.?\d*)\s*Hour', 'X.X Hour(s)'),
            (r'(\d+\.?\d*)\s*Contact\s*Hour', 'X.X Contact Hour(s)'),
        ]
        
        for pattern, desc in patterns:
            matches = response.xpath('//text()').re(pattern)
            if matches:
                print(f"   ✓ {desc}: {matches}")
        
        # 4. Save full HTML for manual inspection
        with open('pesi_detail_page.html', 'wb') as f:
            f.write(response.body)
        
        print("\n✓ Saved full HTML to: pesi_detail_page.html")
        print("="*80 + "\n")

if __name__ == "__main__":
    process = CrawlerProcess()
    process.crawl(TestCESpider)
    process.start()