import scrapy
from itemadapter import ItemAdapter


class DeduplicationPipeline:
    """
    Pipeline to prevent duplicate items based on URL
    """
    
    def __init__(self):
        self.urls_seen = set()
    
    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        url = adapter.get('url')
        
        if url in self.urls_seen:
            spider.logger.debug(f'Duplicate item found: {url}')
            # Drop the item by not returning it
            raise scrapy.exceptions.DropItem(f'Duplicate item found: {url}')
        else:
            self.urls_seen.add(url)
            return item
