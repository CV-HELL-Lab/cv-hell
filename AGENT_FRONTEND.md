# AGENT_FRONTEND.md — Frontend Agent Guide for CV HELL

## Project Overview
CV HELL is a world-boss AI game for CV/resume roasting. Users do not choose a boss freely. The whole platform has one active global boss at a time. Users upload a resume, get brutally harsh structural/layout feedback, revise, and resubmit. The first user to make the current boss approve unlocks the next global boss.

The frontend must feel like:
- a boss fight
- a live internet challenge
- harsh, stylish, darkly funny
- more game-like than enterprise SaaS

---

## Product Goals
The UI should communicate:
- there is one global active boss
- the boss is hard to satisfy
- defeating a boss is rare
- the platform tracks world progression
- each submission is a battle attempt

The product should NOT feel like:
- a generic resume analyzer
- a corporate dashboard
- a simple chatbot form

---

## Visual Direction
Style references:
- boss fight interface
- dark UI
- sharp typography
- high contrast
- slightly chaotic but still usable
- a sense of pressure and confrontation

Tone:
- brutal
- funny
- dramatic
- memorable

Avoid:
- cartoonish silliness
- overly polished corporate HR visuals
- bland white dashboard styling

---

## Authentication Pages

### Login Page (`/login`)
- Email + password form
- Link to register page
- On success: store JWT in `localStorage` as `cvhell_token`, redirect to `/`

### Register Page (`/register`)
- Email + password + display name form
- Password min 8 characters
- On success: store JWT in `localStorage` as `cvhell_token`, redirect to `/`

All authenticated API requests attach `Authorization: Bearer <token>` header.
If the token is missing or expired, redirect to `/login`.

---

## Core Pages

### 1. Home Page
Must show:
- product name: CV HELL
- current global boss
- current boss status (undefeated / defeated)
- CTA to challenge the current boss
- CTA to view world progress
- CTA to view winners

Suggested hero line:
- Upload your CV. Face the boss. Make it shut up.

### 2. Current Boss Page
Show:
- boss name
- boss description
- boss specialty
- world-first status
- challenge button

### 3. Battle Page
Layout:
- left: uploaded CV preview or extracted structure view
- right: boss response panel

Must include:
- version number
- boss mood
- latest roast
- top 3 structural crimes
- fix direction
- resubmit button

This page is the most important page in the product.

#### Resume Preview Implementation
Display the extracted text (not raw PDF rendering) in a structured layout:
- Use a monospace or semi-structured card layout to preserve resume sections
- Divide into visual blocks (e.g. Header, Experience, Education, Skills)
- Do not attempt in-browser PDF rendering in MVP

#### Structural Crimes Source
The "top 3 structural crimes" are NOT computed by the frontend.
They come from the backend `top_issues` array in the `/submit/{boss_id}` response.
Simply render the array items as a list — no frontend logic needed.

### 4. World Progress Page
Show:
- boss roadmap
- which bosses are locked/unlocked/defeated/current
- first defeaters
- timestamps
- current season status if applicable

### 5. Victory Page
Must feel dramatic.
Main line:
- You made it shut up.

Subtext (when world first):
- "World first. You are the reason everyone else gets to fight the next boss."

Subtext (when not world first):
- "You silenced it. Someone got here before you, but the boss has nothing left to say."

Also show:
- which boss was defeated
- whether user got world first
- number of submissions used
- points won from prize pool (only if world first; from `points_won` field)
- new points balance
- next boss unlocked notice
- the boss's final reluctant approval phrase (from `approved_phrase` field)

### 6. Hall of Winners / Leaderboard
Show:
- first defeaters
- fastest clears
- fewest attempts
- current boss race activity

---

## Economy UI

### Points Balance
- Always visible in the top navigation bar when logged in
- Format: `⚡ 60 pts` — persistent, never hidden
- After each submission, animate the deduction (e.g. `-10` flash in red)
- If balance drops to 0, show a persistent warning banner: "You're out of points. You can no longer submit."

### Prize Pool Display
- Show the current Boss's prize pool prominently on the Home Page and Current Boss Page
- Format: `Prize Pool: 230 pts` — updates in real time after each submission response
- On the Battle Page, show the prize pool in the boss response panel as a reminder of what's at stake

### Insufficient Points
- If the user tries to submit with fewer than 10 points, block the action immediately client-side
- Show a modal or inline message: "Not enough points. You need 10 pts to submit. You have X pts."
- Do not allow the submit button to fire the API call

### Victory Points Display
- On the Victory Page, if `world_first: true`, show dramatically: "You won the prize pool: +{points_won} pts"
- Update the points balance in the nav bar immediately after the victory response is received

---

## UX Constraints
- Make the current global boss obvious everywhere.
- Make each submission feel consequential — the points cost reinforces this.
- Do not expose hidden scoring rules.
- Do not expose hidden approval logic.
- The UI should support repeated iterative submissions cleanly.
- The UI should make boss attitude progression visible.
- Points balance must always be visible to logged-in users.

---

## Loading and Error States

### File Upload
- **Loading:** Show a progress indicator with "Preparing for battle..." copy
- **Error:** "Upload failed. File must be PDF or DOCX under 5MB."

### Boss Evaluation (POST /submit)
- **Loading:** Full-panel overlay or animated boss "thinking" state — "The boss is reading your document..." (this call can take 3–8 seconds)
- **Error:** "The boss refused to respond. Try again." with a retry button
- Do NOT show a spinner and immediately redirect — wait for the full LLM response before rendering the battle result

### Boss/Progress Data
- **Loading:** Skeleton cards
- **Error:** Graceful fallback — "World progress unavailable. The servers are also judging you."

---

## Component Suggestions
- BossCard
- BossMoodBadge
- SubmissionVersionPanel
- ResumePreviewPane
- RoastPanel
- StructuralCrimesList
- FixDirectionBox
- WorldProgressTimeline
- VictoryBanner
- LeaderboardTable

---

## Interaction Design
Each submission should feel like:
1. upload
2. confrontation
3. insult lands
4. player adjusts
5. tension rises
6. boss mood shifts
7. possible reluctant approval

The user should feel progression even before winning.

---

## Copywriting Direction

### Boss Voice Copy (roast text, mood labels, boss responses)
The boss voice is vulgar, crude, profane, and lowbrow — this is intentional.
Boss copy may say things like "this layout looks like dogshit" and that is correct tone.
All abuse must target the document, never the user as a person.

Good examples:
- "This version is still a structural disaster."
- "Less embarrassing than before. Barely."
- "The layout stopped screaming, but the hierarchy still whispers garbage."
- "Fine. You win."
- "This thing reads like someone sneezed on a template."

Bad examples:
- direct slurs against the user
- personal attacks on intelligence or identity
- anything that attacks who the person is rather than what the document looks like

### Structural UI Copy (navigation, buttons, labels, error messages)
Structural copy should remain readable and functional. It can have edge and attitude, but should not be so aggressively rude that it confuses users about what to do.

Good: "Upload your CV. Face the boss."
Good: "Try again. The boss is waiting."
Bad: making every button label a profanity-laced insult that obscures its function

---

## Tech Preferences
Preferred stack:
- Next.js
- React
- Tailwind CSS
- TypeScript

UI expectations:
- responsive
- keyboard-friendly where practical
- clean state handling
- clear loading and failure states

---

## Route Structure

```
/                          → Home Page
/login                     → Login Page
/register                  → Register Page
/boss/[slug]               → Current Boss Page (e.g. /boss/layout-tyrant)
/battle/[submissionId]     → Battle Page (active submission + boss response)
/progress                  → World Progress Page
/victory                   → Victory Page (shown after approval)
/leaderboard               → Hall of Winners / Leaderboard
```

Protected routes (require valid JWT): `/battle/*`, `/victory`
Public routes: `/`, `/login`, `/register`, `/boss/*`, `/progress`, `/leaderboard`

---

## Priorities
1. Home page
2. Battle page
3. World progress page
4. Victory page
5. Leaderboard page

The battle page is the highest priority by far.

---

## Frontend Data Needs

| Data Need | Endpoint | Key Response Fields |
|-----------|----------|-------------------|
| Current boss | `GET /boss/current` | `name`, `slug`, `specialty`, `status`, `world_first_defeater`, `prize_pool` |
| Boss roadmap | `GET /bosses/progress` | `bosses[].name`, `bosses[].status`, `bosses[].defeated_at`, `bosses[].world_first_defeater` |
| Submit resume | `POST /submit/{boss_id}` | `roast_opening`, `why_it_fails`, `top_issues`, `fix_direction`, `mood`, `mood_level`, `approved`, `approved_phrase`, `world_first`, `points_deducted`, `points_remaining`, `prize_pool`, `points_won` |
| Upload file | `POST /upload` | `submission_id`, `version_number`, `extracted_text_preview` |
| Submission history | `GET /submissions/{user_id}` | `submissions[].version_number`, `submissions[].mood`, `submissions[].top_issues` |
| Leaderboard | `GET /leaderboard?type=first_defeaters` | `entries[].user_handle`, `entries[].boss_name`, `entries[].metric_value`, `entries[].achieved_at` |

All authenticated requests must include `Authorization: Bearer <token>` header.
Token is stored in `localStorage` as `cvhell_token` after login/register.

---

## Deliverables Expected from This Agent
- page architecture
- component structure
- visual system
- battle page implementation
- progress page implementation
- victory page
- leaderboard UI
- integration-ready frontend code