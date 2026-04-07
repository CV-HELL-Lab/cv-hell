# AGENT_ADMIN.md — Admin Panel Agent Guide for CV HELL

## Project Overview
CV HELL is a world-boss AI resume roasting game. This admin panel is a protected internal tool for the product operator to monitor platform activity, control game state, and tune Boss behavior in real time.

The admin panel lives at `/admin` within the same Next.js frontend project. It is protected by a login gate and is never linked to from the public-facing UI.

---

## Core Responsibilities

The admin panel must support:
- operator login and session management
- real-time platform data monitoring
- Boss management (activate, reset, configure)
- rudeness level control per Boss
- submission and user data inspection
- leaderboard management

---

## Authentication

### Login
- Single operator account; no user registration
- Credentials stored as environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`)
- On login, issue a signed JWT stored in an httpOnly cookie
- Session expires after 24 hours
- All `/admin/*` routes check for valid session server-side; redirect to `/admin/login` if invalid

### Login Page
Route: `/admin/login`
- Username + password form
- No "forgot password" in MVP
- On success: redirect to `/admin/dashboard`

---

## Pages and Features

### 1. Dashboard (`/admin/dashboard`)
Overview of platform health at a glance.

Display:
- Current active Boss (name, status, total submissions so far)
- Total users (all time)
- Total submissions (all time + today)
- Total approvals (all time + today)
- Average submissions per user per boss
- World first defeat history (boss name, winner handle, date)

---

### 2. Boss Management (`/admin/bosses`)
Control the global boss state.

Display:
- Table of all bosses: name, status (locked/current/defeated), order index, defeat date, world first defeater
- Current active boss highlighted

Actions:
- **Activate a boss**: set a specific boss as the current active boss (override normal progression)
- **Reset a boss**: mark a defeated boss as undefeated, clear its BossDefeat record (for testing)
- **Reorder bosses**: change order_index values
- **Add a new boss**: create a new boss entry with name, slug, specialty description

---

### 3. Boss Detail / Rudeness Control (`/admin/bosses/[slug]`)
Per-boss configuration page.

Display:
- Boss name, specialty, current status
- Submission count against this boss
- Approval count for this boss
- Current rudeness level

#### Rudeness Level
Each boss has a configurable rudeness level stored in the database.

Preset tiers:

| Level | Label | Description |
|-------|-------|-------------|
| 1 | Harsh | Sharp, critical, professional-savage tone |
| 2 | Brutal | Cruder language, stronger insults toward the document |
| 3 | No Mercy | Vulgar, profane, lowbrow — "this layout looks like dogshit" tier |

- Default level is 2 (Brutal)
- The backend reads this value when assembling the LLM system prompt for this boss
- Changing the level takes effect on the next submission

Actions:
- Select rudeness level (radio buttons or dropdown, 3 options)
- Save changes

---

### 4. Submissions Browser (`/admin/submissions`)
Browse and inspect all submissions.

Display:
- Paginated table: user handle, boss name, version number, mood, approved (yes/no), timestamp
- Filter by: boss, approval state, date range
- Click a row to view submission detail

#### Submission Detail
- Extracted resume text
- Boss response (roast_opening, why_it_fails, top_issues, fix_direction, mood, approved)
- Raw LLM payload (collapsed by default)
- Whether this submission triggered boss unlock

---

### 5. User Browser (`/admin/users`)
Inspect user activity.

Display:
- Table: display name, email, created_at, total submissions, bosses attempted, any boss defeated
- Click a row to view full submission history for that user

---

### 6. Leaderboard Management (`/admin/leaderboard`)
View and manage leaderboard entries.

Display:
- Same leaderboard data as public `/leaderboard`
- Ability to manually remove an entry (e.g. if a tester polluted the leaderboard)

---

## Backend API Requirements for Admin

The backend must expose a separate set of admin-only endpoints, all protected by the admin session JWT.

### Admin Endpoints

```
POST   /admin/login                         → authenticate, return JWT cookie
POST   /admin/logout                        → clear session

GET    /admin/stats                         → dashboard overview data
GET    /admin/bosses                        → all bosses with full state
POST   /admin/bosses                        → create new boss
PATCH  /admin/bosses/{slug}                 → update boss (status, order, rudeness_level)
POST   /admin/bosses/{slug}/activate        → set as current active boss
POST   /admin/bosses/{slug}/reset           → clear defeat record, set status to unlocked

GET    /admin/submissions?boss=&approved=&page=   → paginated submission list
GET    /admin/submissions/{id}              → submission detail with raw LLM payload

GET    /admin/users?page=                  → paginated user list
GET    /admin/users/{user_id}/submissions  → full submission history for a user

DELETE /admin/leaderboard/{entry_id}       → remove a leaderboard entry
```

All admin endpoints return `401` if the request does not carry a valid admin session.

---

## Data Model Addition

### Boss model — add field:
- `rudeness_level` (integer, default 2, range 1–3)

This field is read by the backend when assembling the LLM prompt for boss evaluation. The backend translates it into prompt-level instructions:
- Level 1: "Use a sharp, critical, professional tone."
- Level 2: "Use crude, harsh language. Be blunt and rude toward the document."
- Level 3: "Be vulgar, profane, and lowbrow. No filters. Attack the document aggressively."

---

## Tech Notes

- Admin panel pages live at `/admin/*` in the same Next.js app
- Admin pages must NOT be included in the public sitemap or linked from public pages
- Session check happens server-side (Next.js middleware or `getServerSideProps`)
- Admin JWT is separate from user JWT (different secret, different claims)
- User authentication uses `Authorization: Bearer <token>` with `JWT_SECRET_KEY`; admin uses its own `ADMIN_SECRET_KEY`
- Style: functional and readable — the admin panel does not need the boss-fight aesthetic. Clean dark dashboard UI is fine.

---

## Priorities
1. Login + session protection
2. Dashboard stats
3. Boss management + rudeness level control
4. Submissions browser
5. User browser
6. Leaderboard management
