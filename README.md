# MacAnswers — Campus Intelligence Platform

A single destination for every McMaster student question.

## Project Structure

```
macanswers/
├── frontend/        # React app (Vite) — deployed on Vercel
├── backend/         # Node.js + Express API — deployed on Render
├── scraper/         # Python scrapers — run via GitHub Actions
└── database/        # Supabase SQL migrations
```

## Quick Start

### 1. Database (Supabase)
- Create a new Supabase project
- Run `database/migrations.sql` in the SQL editor
- Enable the `pgvector` extension (Database → Extensions)
- Copy your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### 4. Scraper
```bash
cd scraper
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in your keys
python run_all.py
```

## Environment Variables

| Service   | Variable | Description |
|-----------|----------|-------------|
| Backend   | `SUPABASE_URL` | Supabase project URL |
| Backend   | `SUPABASE_SERVICE_KEY` | Supabase service role key |
| Backend   | `GEMINI_API_KEY` | Google Gemini API key |
| Backend   | `RESEND_API_KEY` | Resend email API key |
| Frontend  | `VITE_API_URL` | Backend URL |
| Frontend  | `VITE_MAPBOX_TOKEN` | Mapbox public token |
| Scraper   | `SUPABASE_URL` | Supabase project URL |
| Scraper   | `SUPABASE_SERVICE_KEY` | Supabase service role key |
| Scraper   | `GEMINI_API_KEY` | Google Gemini API key |

## Deployment

- **Frontend**: Connect the `frontend/` folder to Vercel
- **Backend**: Connect the `backend/` folder to Render (web service, Node)
- **Scrapers**: GitHub Actions workflows in `.github/workflows/` run automatically
