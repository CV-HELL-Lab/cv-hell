# PRODUCT_DEFINITION

## 1. One-Line Product Definition
CV HELL is a roast-driven AI boss battle where users improve CV presentation quality through iterative challenges until the boss reluctantly approves.

## 2. Problem Statement
- Students and early-career job seekers often get vague CV feedback.
- Existing tools are either too polite, too generic, or ATS-only score checkers.
- Users need fast, memorable, actionable guidance on layout, structure, hierarchy, and scan-ability.

## 3. Target Users
- Primary: university students, fresh graduates, internship applicants.
- Secondary: career-week participants, hackathon users, people benchmarking CV presentation quality.

## 4. Value Proposition
- Converts boring CV review into a high-engagement challenge loop.
- Delivers concrete structural fixes each round.
- Creates motivation via mood progression and clear win state.

## 5. MVP Scope (In Scope)
- One active boss: The Layout Tyrant.
- Upload CV (PDF; DOCX optional).
- Text extraction + structural analysis prompt.
- Fixed boss output format:
  - Opening Roast
  - Why This Still Fails
  - Top 3 Structural Crimes
  - Fix Direction
  - Boss Mood
- Iterative submit loop with session state.
- Win state trigger and victory page.

## 6. Out of Scope (Not in MVP)
- Multi-boss world unlock system.
- Real-time global first-kill race.
- Ranking/season/replay systems.
- Deep verification of experience authenticity.

## 7. Primary User Journey
1. User opens homepage and starts challenge.
2. User uploads CV.
3. System extracts text and creates session.
4. Boss returns structured roast + fix direction.
5. User revises CV and resubmits.
6. Boss mood shifts with progress.
7. When high-value structural issues are exhausted, win state appears.

## 8. Success Metrics
- End-to-end loop completion rate.
- Average rounds to first win.
- Percentage of responses with actionable fixes.
- Demo stability: full flow succeeds 3 consecutive times.

## 9. Demo Story (5-Minute Flow)
1. Show the problem in 20 seconds.
2. Upload a messy CV.
3. Boss attacks layout and hierarchy.
4. Apply visible fixes and resubmit.
5. Show mood improvement and final reluctant approval.
6. Close with how AI drives structured coaching, not random chat.

## 10. Risks and Mitigations
- Risk: Boss becomes pure insult.
  - Mitigation: enforce fixed response schema with concrete fix direction.
- Risk: Boss never approves.
  - Mitigation: hidden win threshold with explicit structural criteria.
- Risk: API instability during demo.
  - Mitigation: mock fallback mode with safe deterministic output.

## 11. Next Milestones (Post-Hackathon)
- Add Boss 2 to Boss 5 progression.
- Add global unlock and first-kill tracking.
- Add leaderboard and event mode.
- Expand reference pool for stronger consistency.
