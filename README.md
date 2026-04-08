# CV HELL

**A gamified AI resume critic that brutalizes your CV until it's actually good.**

Submit your resume. An AI Boss tears it apart. Improve it. Repeat until the Boss approves — or you run out of points trying.

---

## What is this?

CV HELL is a game-ified resume feedback platform. You upload your resume (PDF or DOCX), and a ruthless AI "Boss" character evaluates it with dramatic, over-the-top criticism. The goal is to improve your resume until the Boss approves — earning the prize pool accumulated from everyone's submission fees.

Each Boss specializes in a different aspect of resume quality:

| Boss | Specialty |
|---|---|
| 🎨 The Layout Tyrant | Visual design, margins, alignment, fonts |
| 💼 The Cold Recruiter | ATS compatibility, keywords, readability |
| 🔫 The Bullet Butcher | Bullet point quality, action verbs, quantification |
| ☠️ The Scan Reaper | Formatting for automated parsing |
| 🎯 The Structure Sniper | Information hierarchy and organization |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | FastAPI (Python 3.12+), SQLAlchemy |
| Database | PostgreSQL |
| AI | Qwen LLM API / DeepSeek (OpenAI-compatible) |
| Encryption | AES-256-CBC + PBKDF2-SHA256 (client-side) |
| Runtime | Node.js 20+, Python 3.12+ |

---

## Quick Start

### One-line install (Linux / macOS / Raspberry Pi)

```bash
git clone https://github.com/CV-HELL-Lab/cv-hell.git ~/Desktop/cv-hell
cd ~/Desktop/cv-hell
bash setup.sh
```

The setup script automatically:
- Installs system dependencies (Node.js, PostgreSQL, Python3, poppler)
- Creates and configures the PostgreSQL database
- Sets up the Python virtual environment
- Builds the frontend (production mode)
- Generates a `start.sh` management script

After setup, access the app at **`http://<your-ip>:8765`**

### Managing the service

```bash
./start.sh start    # Start both frontend and backend
./start.sh stop     # Stop all services
./start.sh restart  # Restart
./start.sh status   # Check running processes
./start.sh update   # Pull latest code + rebuild + restart
```

---

## Configuration

All backend configuration lives in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/cvhell
JWT_SECRET_KEY=<your-random-secret>
ADMIN_PASSWORD_HASH=<bcrypt-hash>
ADMIN_SECRET_KEY=<your-admin-secret>
SUBMISSION_COST=10
INITIAL_POINTS=100
```

> **LLM API keys** are configured through the admin panel at `http://localhost:8765/admin` — no restart required.

---

## How It Works

```
User uploads resume (PDF/DOCX)
        ↓
Backend extracts text + converts pages to images
        ↓
Images & text sent to LLM with Boss personality prompt
        ↓
Boss delivers verdict: roast, specific issues, fix direction
        ↓
10 points deducted → added to prize pool
        ↓
User revises resume and tries again
        ↓
Boss approves → User wins the entire prize pool 🏆
```

### Point Economy

- New users start with **100 points**
- Each submission costs **10 points**
- All fees accumulate in the **prize pool**
- The **first user** to get a Boss approval wins the entire pool
- Points insufficient → submission blocked (no charge)

---

## Privacy & Encryption

CV HELL is designed with privacy in mind:

- **Original files** (PDF/DOCX) are deleted immediately after text extraction
- **Page images** are deleted immediately after the LLM processes them
- **CV text** can be encrypted client-side with your own password

### CV Vault (Client-Side Encryption)

Enable the CV Vault in your profile settings. Your resume text is encrypted in the browser before being sent to the server — using **AES-256-CBC** with a key derived from your password via **PBKDF2-SHA256 (100,000 iterations)**.

Your encryption key **never leaves your browser**. Not even the server operator can read your stored CV text.

> ⚠️ **There is no password recovery.** If you forget your vault password, your stored CV text is permanently unreadable. Your account and battle history are unaffected.

See [Terms & Privacy](/terms) for the full breakdown of what is and isn't stored.

---

## Screenshots

> *(Coming soon)*

---

## Development

### Backend (FastAPI)

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # then fill in values
uvicorn main:app --reload --port 9876
```

### Frontend (Next.js)

```bash
cd frontend
npm install
BACKEND_URL=http://127.0.0.1:9876 npm run dev
```

Frontend dev server runs on port 3000. The `BACKEND_URL` env var tells Next.js where to proxy `/api/*` requests.

### Seeding Data

```bash
cd backend
source venv/bin/activate
python seed.py              # Initialize Boss records
python seed_reference_pool.py  # Load reference CV examples
```

### Admin Panel

Visit `/admin` and log in with the credentials defined in `.env`. From there you can:
- Configure the LLM provider and API key
- Advance Boss states (unlock/activate)
- View all users and submissions

---

## Deployment Notes

### Ports

| Service | Default Port |
|---|---|
| Frontend (Next.js) | 8765 |
| Backend (FastAPI) | 9876 |

All API calls from the browser go through Next.js rewrites (`/api/*` → backend), so there are no CORS issues and the backend port never needs to be publicly exposed.

### Raspberry Pi

The setup script handles Raspberry Pi (ARM) automatically:
- Uses `psycopg[binary]` instead of `psycopg2`
- Disables piwheels to avoid timeout issues
- Uses `node node_modules/.bin/next start` instead of `npx next start`

---

## Project Structure

```
cv-hell/
├── backend/
│   ├── api/          # FastAPI route handlers
│   ├── boss_configs/ # Boss personality JSON files
│   ├── core/         # Config, database, security
│   ├── llm/          # LLM client, prompt builder, evaluator
│   ├── models/       # SQLAlchemy ORM models
│   ├── parsers/      # PDF/DOCX text + image extraction
│   └── services/     # Business logic
├── frontend/
│   └── src/
│       ├── app/      # Next.js App Router pages
│       ├── components/
│       ├── context/  # Auth + Language global state
│       └── lib/      # API client, dictionary, vault crypto
├── setup.sh          # One-click installer
└── TECHNICAL.md      # Full technical documentation
```

For full technical details, see [TECHNICAL.md](./TECHNICAL.md).

---

## License

MIT
