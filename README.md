# CEU Consolidation Web Application

A full-stack web application that automates CEU discovery, tracking, and compliance management for mental health professionals. The application crawls multiple CEU providers (starting with PESI), consolidates data by field, and helps users track their annual requirements.

## Quick Start (Already Set Up)

If you've already completed the initial setup, run these commands in **3 separate terminals**:

```bash
# Terminal 1: Database + Backend
source venv/bin/activate
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
source venv/bin/activate
cd crawler/tutorial && scrapy crawl pesi
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
│   └── frontend/         # React + TypeScript UI
├── packages/
│   ├── types/            # Shared TypeScript types
│   └── config/           # Shared configurations
├── crawler/              # Scrapy Python crawler
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

## Crawler Setup

The Scrapy crawler is located in `crawler/tutorial/`:

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install Python dependencies
cd crawler
pip install -r requirements.txt

# Run the crawler
cd tutorial
scrapy crawl pesi
```

> Configure database connection in `crawler/tutorial/settings.py` - update `DATABASE_CONFIG` with your PostgreSQL credentials.

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
