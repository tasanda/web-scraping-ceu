# CEU Consolidation Web Application

A full-stack web application that automates CEU discovery, tracking, and compliance management for mental health professionals. The application crawls multiple CEU providers (starting with PESI), consolidates data by field, and helps users track their annual requirements.

## Quick Start (Already Set Up)

If you've already completed the initial setup, run these commands in **3 separate terminals**:

```bash
# Terminal 1: Database + Backend
source .venv/bin/activate
docker-compose up -d postgres
cd apps/backend && pnpm dev

# Terminal 2: Frontend
cd apps/frontend && pnpm dev

# Terminal 3: Ngrok (for Clerk webhooks)
ngrok http 3001
```

> **Note:** Copy the ngrok URL and update your Clerk webhook endpoint if the URL changed.

**Optional - Run Crawler (Terminal 4):**
```bash
source .venv/bin/activate
cd crawler/tutorial

# Two-phase crawler (recommended)
python run_crawler.py --provider pesi --max-pages 50

# Or legacy direct spider
scrapy crawl pesi
```

---

## Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces
- **Backend**: Express + TypeScript
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Clerk
- **Scraping**: Scrapy (Python)
- **Deployment**: Google Cloud Platform (Cloud Run)

## Project Structure

```
CEU/
├── apps/
│   ├── backend/          # Express + TypeScript API
│   │   └── prisma/       # Database schema & migrations
│   └── frontend/         # React + TypeScript UI
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configurations
├── crawler/              # Scrapy Python crawler
│   └── tutorial/
│       ├── spiders/      # Web crawling spiders
│       ├── pipelines/    # Data storage pipelines
│       └── processing/   # NLP extraction module
└── docker-compose.yml    # Local development setup
```

## Prerequisites

- Node.js 18+ and pnpm 8+
- PostgreSQL 15+
- Python 3.8+ (for crawler)
- Docker and Docker Compose

---

## Initial Setup (From Scratch)

### 1. Install Dependencies

```bash
# Install pnpm if you haven't already
npm install -g pnpm

# Install all dependencies
pnpm install
```

### 2. Set Up Environment Variables

Create `.env` files in the respective app directories:

**apps/backend/.env:**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ceu_db?schema=public"
PORT=3001
NODE_ENV=development
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here
SKIP_AUTH=false
```

**apps/frontend/.env:**
```env
VITE_API_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

> Create a free [Clerk account](https://clerk.com) to get your API keys.

### 3. Set Up Database

```bash
# Start PostgreSQL (using Docker)
docker-compose up -d postgres

# Run migrations
cd apps/backend
pnpm db:migrate

# Generate Prisma Client
pnpm db:generate
```

### 4. Build Shared Packages

```bash
# Build types package (required for other packages)
pnpm --filter @ceu/types build
```

### 5. Run Development Servers

```bash
# Run both backend and frontend in development mode
pnpm dev

# Or run individually:
pnpm --filter @ceu/backend dev
pnpm --filter @ceu/frontend dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## Clerk Webhook Setup

For user authentication to work properly, you need to configure Clerk webhooks.

### 1. Install ngrok

```bash
# On Mac with Homebrew
brew install ngrok

# Or download from: https://ngrok.com/download
```

### 2. Start ngrok

```bash
ngrok http 3001

# You'll see output like:
# Forwarding   https://abc123.ngrok-free.app -> http://localhost:3001
```

### 3. Configure Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Click **Webhooks** in the left sidebar
4. Click **+ Add Endpoint**
5. Set Endpoint URL: `https://YOUR-NGROK-URL.ngrok-free.app/api/webhooks/clerk`
6. Subscribe to events:
   - ✅ `user.created`
   - ✅ `user.updated`
7. Click **Create**
8. Copy the **Signing Secret** (starts with `whsec_...`)
9. Add it to `apps/backend/.env` as `CLERK_WEBHOOK_SECRET`

---

## Admin Access

The application includes an admin dashboard for managing courses, providers, users, and compliance records. Admin access is controlled via Clerk's user metadata.

### Making a User an Admin

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Click **Users** in the left sidebar
4. Find and click on the user you want to make an admin
5. Scroll down to **Public metadata**
6. Click **Edit** and add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
7. Click **Save**

The user will now see an "Admin" link in the navigation bar and have access to:
- **Overview** - Dashboard statistics (total users, courses, providers, compliance status)
- **Courses** - Edit or delete any course (title, credits, description, etc.)
- **Providers** - Add, edit, or deactivate CEU providers
- **Users** - View all users and their compliance status, manually adjust compliance records
- **Manual Reviews** - Review and approve courses manually added by users

### Removing Admin Access

To remove admin access, either:
- Delete the `role` key from the user's public metadata, or
- Change the value to something other than `"admin"`

---

## Crawler Setup

The crawler uses a **two-phase architecture** for robust data extraction:

1. **Phase 1 (HTML Collection)**: Crawl websites and store raw HTML
2. **Phase 2 (NLP Processing)**: Extract structured data using NLP and pattern matching

### Installation

```bash
# Activate the project virtual environment
source .venv/bin/activate

# Install Python dependencies
cd crawler
pip install -r requirements.txt

# Download spaCy language model (required for NLP)
python -m spacy download en_core_web_sm
```

### Quick Start

```bash
cd crawler/tutorial

# Option 1: Run both phases (crawl + process)
python run_crawler.py --provider pesi --max-pages 50

# Option 2: Run the original direct spider (legacy)
scrapy crawl pesi
```

### Two-Phase Architecture

#### Phase 1: HTML Collection

Collects raw HTML and stores it in the `RawCrawlData` table for later processing.

```bash
# Crawl and store HTML only
python run_crawler.py --provider pesi --max-pages 100 --phase 1

# Or use scrapy directly
scrapy crawl html_collector -a provider=pesi -a max_pages=100
```

#### Phase 2: NLP Processing

Processes stored HTML using:
- **Text Extraction**: Title, description, headings from HTML
- **spaCy NER**: Dates, money, persons, organizations
- **CEU Pattern Matching**: Credits, prices, course types, professional fields

```bash
# Process all pending records
python run_crawler.py --phase 2 --limit 100

# Or use the CLI directly
python -m tutorial.processing process --limit 100 --provider pesi
```

### CLI Commands

```bash
# Show processing statistics
python -m tutorial.processing stats

# Reprocess a specific record
python -m tutorial.processing reprocess --id <record-id>

# Test extraction on a URL (for debugging)
python -m tutorial.processing test --url "https://www.pesi.com/sales/..."
```

### Extraction Pipeline

The NLP processing pipeline extracts:

| Field | Method | Confidence |
|-------|--------|------------|
| Title | HTML h1/title tags | High |
| Credits | Regex patterns (e.g., "6.5 CE Hours") | 0.6-0.95 |
| Price | Regex patterns (e.g., "$199.99") | 0.8-0.9 |
| Course Type | Keyword matching (live, on-demand, self-paced) | 0.8-0.95 |
| Professional Field | Keyword scoring (mental_health, nursing, etc.) | 0.5-0.95 |
| Dates | spaCy NER + regex | 0.7-0.8 |
| Instructors | spaCy PERSON entities + patterns | 0.7-0.8 |

### Project Structure

```
crawler/
├── requirements.txt              # Python dependencies
├── run_crawler.py                # Convenience script for both phases
└── tutorial/
    ├── settings.py               # Scrapy settings & database config
    ├── spiders/
    │   ├── pesi_spider.py        # Original direct spider (legacy)
    │   └── html_collector.py     # Phase 1: HTML collection spider
    ├── pipelines/
    │   ├── database_pipeline.py  # Direct database insertion
    │   └── html_storage_pipeline.py  # Phase 1: HTML storage
    └── processing/               # Phase 2: NLP extraction
        ├── __init__.py
        ├── cli.py                # Command-line interface
        ├── processor.py          # Main orchestration
        ├── text_extractor.py     # HTML text extraction
        ├── nlp_processor.py      # spaCy NER
        └── ceu_patterns.py       # CEU-specific regex patterns
```

### Configuration

Update database connection in `crawler/tutorial/tutorial/settings.py`:

```python
DATABASE_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'ceu_db',
    'user': 'postgres',
    'password': 'postgres'
}
```

### Adding New Providers

1. Add provider config to `html_collector.py`:
```python
PROVIDERS = {
    'new_provider': {
        'start_urls': ['https://www.newprovider.com/'],
        'base_url': 'www.newprovider.com',
        'course_link_selector': 'a.course-link::attr(href)',
        'listing_patterns': ['/courses', '/catalog'],
        'course_patterns': ['/course/', '/product/'],
    },
}
```

2. Run the crawler:
```bash
python run_crawler.py --provider new_provider --max-pages 50
```

### Troubleshooting & Logs

#### Phase 1 (Scrapy) Debugging

```bash
cd crawler/tutorial
source ../../.venv/bin/activate

# Run with verbose logging (INFO level)
scrapy crawl html_collector -a provider=pesi -a max_pages=3 -L INFO

# Run with verbose logging (INFO level) and Save all output to file for later review
scrapy crawl html_collector -a provider=pesi -a max_pages=5 -L INFO 2>&1 | tee crawler_output.log

# Run with debug logging (very verbose)
scrapy crawl html_collector -a provider=pesi -a max_pages=5 -L DEBUG

# Save logs to file
scrapy crawl html_collector -a provider=pesi -a max_pages=5 \
  --logfile=crawl.log -L DEBUG
```

#### Phase 2 (NLP Processing) Debugging

```bash
cd crawler/tutorial
source ../../.venv/bin/activate

# Run with verbose output
python -m tutorial.processing process --limit 10 -v

# Run with debug output (includes line numbers)
python -m tutorial.processing process --limit 10 --debug

# Test extraction on a single URL (great for debugging)
python -m tutorial.processing test --url "https://www.pesi.com/sales/..."

# View failed records with error messages
python -m tutorial.processing failed --limit 10

# Reprocess a specific failed record
python -m tutorial.processing reprocess --id <record-id>
```

#### Useful Database Queries

```bash
# Check processing statistics
python -m tutorial.processing stats

# View recent records with status
python -c "
import psycopg2
from psycopg2.extras import RealDictCursor
conn = psycopg2.connect(host='localhost', port=5432, database='ceu_db',
                        user='postgres', password='postgres')
cur = conn.cursor(cursor_factory=RealDictCursor)
cur.execute('''SELECT url, status, \"pageType\" FROM \"RawCrawlData\"
               ORDER BY \"crawledAt\" DESC LIMIT 10''')
for row in cur.fetchall():
    print(f\"{row['status']:12} {row['pageType']:15} {row['url'][:50]}...\")
"

# Clear all raw crawl data (start fresh)
python -c "
import psycopg2
conn = psycopg2.connect(host='localhost', port=5432, database='ceu_db',
                        user='postgres', password='postgres')
cur = conn.cursor()
cur.execute('DELETE FROM \"RawCrawlData\"')
conn.commit()
print('Cleared all RawCrawlData records')
"
```

#### Common Issues

| Issue | Solution |
|-------|----------|
| `ModuleNotFoundError: No module named 'bs4'` | Run: `pip install beautifulsoup4` |
| `ModuleNotFoundError: No module named 'spacy'` | Run: `pip install spacy && python -m spacy download en_core_web_sm` |
| Pages detected as "unknown" type | Update `course_patterns` in `html_collector.py` |
| All records "skipped" | Check that `pageType` is "course_detail" in RawCrawlData |
| Database connection failed | Ensure PostgreSQL is running: `docker-compose up -d postgres` |

---

## Using Docker

```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up

# Start specific services
docker-compose up postgres backend

# Stop containers
docker-compose down
```

---

## Available Scripts

### Root Level

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps |
| `pnpm type-check` | Type check all apps |

### Backend (`apps/backend`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:studio` | Open Prisma Studio |

### Frontend (`apps/frontend`)

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |

---

## API Endpoints

### Courses
- `GET /api/courses` - Get paginated courses with filters
- `GET /api/courses/:id` - Get course details

### Users (Protected)
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile

### Tracking (Protected)
- `GET /api/tracking` - Get user's tracked courses
- `POST /api/tracking` - Add course to tracking
- `PUT /api/tracking/:id` - Update tracking status
- `GET /api/tracking/compliance` - Get compliance status

### Admin (Protected - Admin Only)
- `GET /api/admin/stats` - Get dashboard statistics
- `GET /api/admin/users` - Get all users with compliance info
- `GET /api/admin/courses` - Get all courses (with search/filter)
- `PUT /api/admin/courses/:id` - Update a course
- `DELETE /api/admin/courses/:id` - Delete a course
- `GET /api/admin/courses/manual` - Get manually added courses for review
- `GET /api/admin/providers` - Get all providers
- `POST /api/admin/providers` - Create a provider
- `PUT /api/admin/providers/:id` - Update a provider
- `DELETE /api/admin/providers/:id` - Delete a provider
- `PUT /api/admin/compliance/:userId/:year` - Adjust user compliance

---

## Deployment (Google Cloud Platform)

### 1. Build and Push Docker Images

```bash
gcloud builds submit --config cloudbuild.yaml
```

### 2. Deploy to Cloud Run

```bash
gcloud run deploy ceu-backend --image gcr.io/PROJECT_ID/ceu-backend
gcloud run deploy ceu-frontend --image gcr.io/PROJECT_ID/ceu-frontend
```

### 3. Set Up Cloud SQL

- Create PostgreSQL instance
- Update `DATABASE_URL` environment variable
- Run migrations

### 4. Configure Cloud Scheduler for Crawler

```bash
gcloud scheduler jobs create http ceu-crawler \
  --schedule="0 2 * * *" \
  --uri="https://crawler-service.run.app/crawl" \
  --http-method=POST
```

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linters
4. Submit a pull request

## License

MIT
