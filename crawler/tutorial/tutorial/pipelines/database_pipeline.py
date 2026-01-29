import psycopg2
from psycopg2.extras import RealDictCursor
from itemadapter import ItemAdapter
import logging


class DatabasePipeline:
    """
    Pipeline to store scraped courses in PostgreSQL database
    """
    
    def __init__(self):
        self.conn = None
        self.cursor = None
        
    def open_spider(self, spider):
        """Open database connection when spider starts"""
        try:
            # Get database connection details from settings or environment
            db_config = spider.settings.get('DATABASE_CONFIG', {})
            
            self.conn = psycopg2.connect(
                host=db_config.get('host', 'localhost'),
                port=db_config.get('port', 5432),
                database=db_config.get('database', 'ceu_db'),
                user=db_config.get('user', 'postgres'),
                password=db_config.get('password', 'postgres')
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            spider.logger.info('Database connection opened')
        except Exception as e:
            spider.logger.error(f'Failed to open database connection: {e}')
            raise
    
    def close_spider(self, spider):
        """Close database connection when spider closes"""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        spider.logger.info('Database connection closed')
    
    def process_item(self, item, spider):
        """Process and store item in database"""
        adapter = ItemAdapter(item)
        
        try:
            # First, get or create the provider
            provider_id = self._get_or_create_provider(adapter, spider)
            
            # Check if course already exists (by URL)
            course_id = self._get_course_id_by_url(adapter.get('url'), spider)
            
            if course_id:
                # Update existing course
                self._update_course(course_id, adapter, provider_id, spider)
            else:
                # Insert new course
                self._insert_course(adapter, provider_id, spider)
                
        except Exception as e:
            spider.logger.error(f'Error processing item: {e}')
            # Don't fail the item, just log the error
        
        return item
    
    def _get_or_create_provider(self, adapter, spider):
        """Get or create CEU provider"""
        provider_name = adapter.get('provider', 'pesi')
        
        # Check if provider exists
        self.cursor.execute(
            'SELECT id FROM "CeuProvider" WHERE name = %s',
            (provider_name,)
        )
        result = self.cursor.fetchone()
        
        if result:
            return result['id']
        
        # Create new provider
        base_url = adapter.get('source_url', '').split('/')[2] if adapter.get('source_url') else ''
        
        self.cursor.execute(
            """
            INSERT INTO "CeuProvider" (id, name, "baseUrl", active)
            VALUES (gen_random_uuid(), %s, %s, true)
            RETURNING id
            """,
            (provider_name, base_url)
        )
        provider_id = self.cursor.fetchone()['id']
        self.conn.commit()
        spider.logger.info(f'Created new provider: {provider_name}')
        
        return provider_id
    
    def _get_course_id_by_url(self, url, spider):
        """Check if course already exists by URL"""
        if not url:
            return None
        
        self.cursor.execute(
            'SELECT id FROM "CeuCourse" WHERE url = %s',
            (url,)
        )
        result = self.cursor.fetchone()
        
        return result['id'] if result else None
    
    def _parse_datetime(self, date_str):
        """Parse ISO datetime string to datetime object"""
        from datetime import datetime
        if not date_str:
            return None
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return None

    def _insert_course(self, adapter, provider_id, spider):
        """Insert new course into database"""
        from datetime import datetime

        # Map field values
        field_mapping = {
            'mental_health': 'mental_health',
            'psychology': 'psychology',
            'counseling': 'counseling',
            'nursing': 'nursing',
            'social_work': 'social_work',
            'other': 'other'
        }
        field = field_mapping.get(adapter.get('field', 'other'), 'other')

        # Map course type values
        course_type_mapping = {
            'live_webinar': 'live_webinar',
            'in_person': 'in_person',
            'on_demand': 'on_demand',
            'self_paced': 'self_paced'
        }
        course_type = course_type_mapping.get(adapter.get('course_type', 'on_demand'), 'on_demand')

        # Parse dates
        start_date = self._parse_datetime(adapter.get('start_date'))
        end_date = self._parse_datetime(adapter.get('end_date'))
        registration_deadline = self._parse_datetime(adapter.get('registration_deadline'))

        self.cursor.execute(
            """
            INSERT INTO "CeuCourse" (
                id, "providerId", title, url, description, instructors,
                price, "originalPrice", "priceString",
                credits, "creditsString",
                duration, "durationString",
                category, field, date, "imageUrl",
                "courseType", "startDate", "endDate", "registrationDeadline",
                "scrapedAt"
            )
            VALUES (
                gen_random_uuid(), %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s
            )
            RETURNING id
            """,
            (
                provider_id,
                adapter.get('title'),
                adapter.get('url'),
                adapter.get('description'),
                adapter.get('instructors'),
                # Numeric values
                adapter.get('price'),
                adapter.get('original_price'),
                adapter.get('price_string'),
                adapter.get('credits'),
                adapter.get('credits_string'),
                adapter.get('duration'),
                adapter.get('duration_string'),
                # Other fields
                adapter.get('category') or adapter.get('product_type'),
                field,
                adapter.get('date'),
                adapter.get('image_url'),
                # New fields
                course_type,
                start_date,
                end_date,
                registration_deadline,
                datetime.now()
            )
        )
        course_id = self.cursor.fetchone()['id']
        self.conn.commit()
        spider.logger.info(f'Inserted new course: {adapter.get("title")}')
    
    def _update_course(self, course_id, adapter, provider_id, spider):
        """Update existing course"""
        from datetime import datetime

        field_mapping = {
            'mental_health': 'mental_health',
            'psychology': 'psychology',
            'counseling': 'counseling',
            'nursing': 'nursing',
            'social_work': 'social_work',
            'other': 'other'
        }
        field = field_mapping.get(adapter.get('field', 'other'), 'other')

        # Map course type values
        course_type_mapping = {
            'live_webinar': 'live_webinar',
            'in_person': 'in_person',
            'on_demand': 'on_demand',
            'self_paced': 'self_paced'
        }
        course_type = course_type_mapping.get(adapter.get('course_type', 'on_demand'), 'on_demand')

        # Parse dates
        start_date = self._parse_datetime(adapter.get('start_date'))
        end_date = self._parse_datetime(adapter.get('end_date'))
        registration_deadline = self._parse_datetime(adapter.get('registration_deadline'))

        self.cursor.execute(
            """
            UPDATE "CeuCourse"
            SET title = %s, description = %s, instructors = %s,
                price = %s, "originalPrice" = %s, "priceString" = %s,
                credits = %s, "creditsString" = %s,
                duration = %s, "durationString" = %s,
                category = %s, field = %s, date = %s, "imageUrl" = %s,
                "courseType" = %s, "startDate" = %s, "endDate" = %s, "registrationDeadline" = %s,
                "scrapedAt" = %s
            WHERE id = %s
            """,
            (
                adapter.get('title'),
                adapter.get('description'),
                adapter.get('instructors'),
                adapter.get('price'),
                adapter.get('original_price'),
                adapter.get('price_string'),
                adapter.get('credits'),
                adapter.get('credits_string'),
                adapter.get('duration'),
                adapter.get('duration_string'),
                adapter.get('category') or adapter.get('product_type'),
                field,
                adapter.get('date'),
                adapter.get('image_url'),
                course_type,
                start_date,
                end_date,
                registration_deadline,
                datetime.now(),
                course_id
            )
        )
        self.conn.commit()
        spider.logger.info(f'Updated course: {adapter.get("title")}')
