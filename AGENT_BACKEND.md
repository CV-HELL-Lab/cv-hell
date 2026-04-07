# AGENT_BACKEND.md — Backend Agent Guide for CV HELL

## Project Overview
CV HELL is a world-boss AI game for CV/resume roasting. There is only one active global boss at a time. Users upload resumes, receive harsh feedback focused on formatting, layout, structure, information hierarchy, and scan-ability, then resubmit improved versions. The first user to make the current boss reluctantly approve unlocks the next boss globally.

This backend is responsible for:
- file upload and parsing
- boss session orchestration
- world boss progression
- persistence
- resume version history
- win condition handling
- leaderboard and world progress APIs

---

## Core Product Constraints
- The system is NOT a traditional resume scoring tool.
- The system should NOT rely on public visible scoring rules.
- Bosses should appear harsh, stubborn, and difficult to satisfy.
- The backend must support hidden reference pools and hidden approval thresholds.
- The backend must support one globally active boss at a time.
- The backend must allow a boss to be defeated once, then unlock the next boss.

---

## Functional Scope

### 1. File Intake
Support:
- PDF upload
- DOCX upload
- optional pasted plain text

Requirements:
- extract text from document
- convert PDF pages to images (one image per page)
- store original file on disk (local storage in MVP, path stored in DB)
- normalize extracted text content
- create resume submission version records

Recommended libraries:
- PDF text extraction: `pdfplumber` (preserves layout awareness better than pypdf)
- PDF to image: `pdf2image` (wraps poppler; requires poppler installed on server)
- DOCX extraction: `python-docx`
- DOCX to image: render via LibreOffice headless conversion to PDF first, then pdf2image
- Normalization: strip excessive whitespace, preserve section-level line breaks, do not flatten into one block

#### Dual-Input LLM Payload
For each submission, the evaluation call sends both:
1. **Image(s):** base64-encoded page images from the PDF/DOCX
2. **Text:** normalized extracted text

The vision-capable LLM (Qwen-VL or DeepSeek-VL) receives both in a single call. This enables the Boss to attack visual layout (from image) and structural logic (from text) simultaneously.

### 2. Boss Session Engine
For each submission, execute the following steps **inside a single database transaction**:

1. Check user points balance ≥ 10; if not, return `402` with `"insufficient_points"` error
2. Deduct 10 points from `User.points`
3. Add 10 points to `PrizePool.total_points` for the current boss
4. Write a `PointTransaction` record (`type: submission_fee`, amount: -10)
5. Commit the deduction + pool update atomically before calling the LLM
6. Call the LLM evaluation pipeline
7. Store returned boss feedback (`BossResponse`)
8. If `approved: true`:
   - Attempt to insert `BossDefeat` record (unique constraint on `boss_id`)
   - If insert succeeds (first kill): trigger prize pool settlement (see below)
   - If insert fails (already defeated): mark response as `world_first: false`, skip settlement
9. If not approved: return response normally

#### Prize Pool Settlement (first-kill only)
Execute as a separate strong-consistency transaction:
1. Lock the `PrizePool` row (`SELECT FOR UPDATE`)
2. Verify `settled = false`; if already true, abort (race condition guard)
3. Transfer `PrizePool.total_points` to `User.points` of the winner
4. Write a `PointTransaction` record (`type: prize_payout`, amount: +pool_total)
5. Set `PrizePool.settled = true`, `winner_user_id`, `settled_at`
6. Commit

This two-transaction design ensures the submission fee is always recorded even if the LLM call fails, and the payout is always atomic and idempotent.

### 3. World Boss Progression
Need a global state model:
- current active boss
- unlocked bosses
- defeated bosses
- first defeater user id
- defeat timestamp

#### Concurrency and Race Condition Handling
When a user achieves approval, the boss unlock must be atomic:
- Use a database-level unique constraint on `BossDefeat.boss_id` so only one defeat record per boss can be inserted
- Use `INSERT ... ON CONFLICT DO NOTHING` or equivalent to handle simultaneous approvals
- The first successful insert wins; subsequent inserts are silently ignored
- The response to any user who triggered approval (even if not first) should still show their Victory Page — only the "world first" badge is exclusive

### 4. History
Persist:
- user
- submission version number
- parsed resume text snapshot
- boss response
- boss mood
- whether it was an approval
- timestamp

### 5. Leaderboards
Need endpoints for:
- first defeaters
- fastest clears
- fewest submissions per boss
- current boss status

---

## Non-Goals
- Do not build a public scoring rubric system.
- Do not expose hidden approval criteria to frontend.
- Do not build ATS keyword scoring as a public feature in MVP.
- Do not over-engineer resume semantic evaluation. Focus on presentation-oriented orchestration.

---

## Architecture Preferences
Preferred stack:
- Python + FastAPI
- PostgreSQL
- SQLAlchemy or equivalent ORM
- Supabase optional if it speeds up implementation

Suggested modules:
- api/
- services/
- models/
- repositories/
- parsers/
- llm/
- boss_engine/
- world_state/

Keep the code modular and production-like, but optimize for hackathon speed.

---

## Suggested Data Models

### User Authentication
Users register and log in with email + password. No OAuth, no magic links in MVP.

- Passwords are hashed with `bcrypt` before storage
- On login, issue a signed JWT (HS256, secret from `JWT_SECRET_KEY` env var)
- JWT expires in 7 days
- Frontend stores JWT in `localStorage` and sends it as `Authorization: Bearer <token>` header on all authenticated requests
- All game endpoints (`/submit`, `/upload`, `/submissions`) require a valid JWT

### User
- id (UUID, server-generated)
- email (unique)
- password_hash
- display_name (user-chosen on registration, shown on leaderboard)
- points (integer, default 100) — virtual points balance
- created_at

### Boss
- id
- name
- slug
- order_index
- status (locked/unlocked/defeated/current)
- created_at

### BossDefeat
- id
- boss_id
- user_id
- submission_id
- defeated_at

### Submission
- id
- user_id
- boss_id
- version_number
- source_type
- original_file_path
- extracted_text
- created_at

### BossResponse
- id
- submission_id
- roast_opening
- why_it_fails
- top_issues_json
- fix_direction
- mood
- approved
- raw_llm_payload
- created_at

### PrizePool
- id
- boss_id (unique — one pool per boss)
- total_points (integer, default 0) — accumulated points from all submissions against this boss
- settled (boolean, default false) — true after first-kill payout
- winner_user_id (nullable) — set when settled
- settled_at (nullable timestamp)

### PointTransaction
- id
- user_id
- amount (integer, negative for deductions, positive for awards)
- type (`submission_fee` | `prize_payout`)
- boss_id
- submission_id (nullable)
- created_at

### ReferencePoolItem
- id
- type (excellent / bad / mid / victory_descriptor)
- boss_scope (global or boss-specific)
- content
- tags_json

---

## API Priorities

### MVP Endpoint Contracts

#### POST /auth/register
Create a new user account.

Request body:
```json
{
  "email": "user@example.com",
  "password": "string (min 8 chars)",
  "display_name": "string"
}
```

Response `201`:
```json
{
  "user_id": "uuid",
  "display_name": "string",
  "token": "jwt_string",
  "points": 100
}
```

---

#### POST /auth/login
Authenticate and receive a JWT.

Request body:
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

Response `200`:
```json
{
  "user_id": "uuid",
  "display_name": "string",
  "token": "jwt_string"
}
```

---

#### POST /upload
Upload a resume file; returns extracted text preview and a submission ID.

Request: `multipart/form-data`
- `file`: PDF or DOCX binary
- `source_type`: `"pdf"` | `"docx"` | `"text"`
- `text_content`: plain text (only when source_type is "text")

Header: `Authorization: Bearer <token>`

Response `200`:
```json
{
  "submission_id": "uuid",
  "version_number": 1,
  "extracted_text_preview": "first 300 chars...",
  "source_type": "pdf"
}
```

---

#### POST /submit/{boss_id}
Submit an uploaded resume for boss evaluation.

Request body:
```json
{
  "submission_id": "uuid"
}
```

Header: `Authorization: Bearer <token>`

Response `200`:
```json
{
  "response_id": "uuid",
  "submission_id": "uuid",
  "version_number": 2,
  "roast_opening": "string",
  "why_it_fails": "string",
  "top_issues": ["string", "string", "string"],
  "fix_direction": "string",
  "mood": "Still Terrible",
  "mood_level": 2,
  "approved": false,
  "approved_phrase": "string or null",
  "world_first": false,
  "points_deducted": 10,
  "points_remaining": 60,
  "prize_pool": 130,
  "points_won": 0
}
```

If `approved: true` and `world_first: true`, `points_won` contains the prize pool amount transferred to the user.

Response `402`:
```json
{
  "error": "insufficient_points",
  "points_required": 10,
  "points_remaining": 5
}
```

---

#### GET /boss/current
Returns the currently active global boss.

Response `200`:
```json
{
  "id": "uuid",
  "name": "The Layout Tyrant",
  "slug": "layout-tyrant",
  "order_index": 1,
  "status": "current",
  "specialty": "Visual chaos — margins, alignment, whitespace",
  "defeated_at": null,
  "world_first_defeater": null,
  "prize_pool": 230
}
```

---

#### GET /bosses/progress
Returns the full boss roadmap.

Response `200`:
```json
{
  "bosses": [
    {
      "id": "uuid",
      "name": "The Layout Tyrant",
      "slug": "layout-tyrant",
      "order_index": 1,
      "status": "defeated",
      "defeated_at": "2024-01-01T12:00:00Z",
      "world_first_defeater": "challenger_7f3a"
    },
    {
      "id": "uuid",
      "name": "The Structure Sniper",
      "slug": "structure-sniper",
      "order_index": 2,
      "status": "current",
      "defeated_at": null,
      "world_first_defeater": null
    }
  ]
}
```

---

#### GET /leaderboard
Returns leaderboard data.

Query params: `?type=first_defeaters|fastest_clears|fewest_attempts&limit=20`

Response `200`:
```json
{
  "entries": [
    {
      "user_handle": "challenger_7f3a",
      "boss_name": "The Layout Tyrant",
      "metric_value": 3,
      "metric_label": "attempts",
      "achieved_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

#### GET /submissions/{user_id}
Returns a user's submission history for the current boss.

Response `200`:
```json
{
  "boss_id": "uuid",
  "submissions": [
    {
      "submission_id": "uuid",
      "version_number": 1,
      "created_at": "...",
      "mood": "Disgusted",
      "mood_level": 1,
      "approved": false,
      "top_issues": ["string", "string", "string"]
    }
  ]
}
```

Keep endpoint contracts clean and frontend-friendly.

---

## LLM Integration Notes
The backend should not hardcode giant prompts inline in route handlers.
Instead:
- organize boss persona configs separately
- organize hidden reference pool assembly separately
- build a clean boss-evaluation payload object
- support swapping providers later

Do not write actual public scoring logic into frontend responses.

---

## LLM Integration

Prompt composition is backend-managed and must remain modular, hidden, and swappable.
Keep boss persona configs, reference pool assembly, and prior version context as separate components — never hardcode them inline in route handlers.

### LLM Provider
Use DeepSeek or Qwen as the default model. Both are compatible with the OpenAI SDK interface (`openai` Python package, `base_url` override). Keep the provider abstracted behind a service interface so it can be swapped without touching business logic.

Supported providers (configured via env):
- DeepSeek: `base_url=https://api.deepseek.com`, model `deepseek-chat`
- Qwen: `base_url=https://dashscope.aliyuncs.com/compatible-mode/v1`, model `qwen-turbo` or `qwen-plus`

---

## Approval Logic
Approval should be hidden.
However, the backend must still support a deterministic enough approval pathway.

The evaluation pipeline should consider:
- boss persona
- current submission content
- prior versions by the same user
- hidden reference pool context
- hidden victory-state descriptor

The boss should:
- remain harsh by default
- reflect visible improvement across versions
- avoid repeating identical criticism forever
- eventually approve when threshold is reached

---

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/cvhell
JWT_SECRET_KEY=...                     # used to sign user JWTs
JWT_EXPIRE_DAYS=7

LLM_PROVIDER=qwen                      # deepseek | qwen (both support vision)
LLM_API_KEY=sk-...
LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen-vl-plus                 # must be a vision-capable model
MAX_REFERENCE_ITEMS=3                  # max excellent samples injected per call
MAX_PRIOR_VERSIONS=3                   # max prior submission summaries to inject
BOSS_CONFIGS_PATH=./boss_configs       # directory of per-boss YAML/JSON persona configs
FILE_UPLOAD_MAX_BYTES=5242880          # 5MB
FILE_STORAGE_PATH=./uploads            # local disk path for uploaded files
ALLOWED_FILE_TYPES=pdf,docx
ADMIN_SECRET_KEY=...                   # used to sign admin session tokens
```

---

## Coding Style
- Keep functions small
- Use explicit typing
- Write docstrings for service-layer functions
- Validate all inputs
- Add structured logging
- Handle failure cases cleanly
- Keep hackathon-friendly readability

---

## Priorities
1. Global boss progression
2. Submission + parsing
3. Boss response persistence
4. Approval / unlock flow
5. Leaderboard
6. Cleanup and refactor

---

## Deliverables Expected from This Agent
- backend project structure
- database schema
- core API endpoints
- parsing pipeline
- boss progression engine
- persistence layer
- minimal test coverage for critical flows