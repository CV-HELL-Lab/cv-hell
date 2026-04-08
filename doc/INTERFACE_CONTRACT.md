# INTERFACE_CONTRACT

## 1. Scope and Version
- Scope: CV HELL MVP (single active boss mode).
- Version: v1.0.0
- Purpose: Define stable frontend-backend integration for hackathon delivery.

## 2. Integration Principles
- The contract MUST be treated as the single source of truth.
- Frontend and backend MUST use identical field names and types.
- Challenge and revision responses MUST follow the same output shape.
- Breaking changes MUST be versioned.

## 3. Core Data Model

### Session
- `sessionId` (string): unique challenge session ID.
- `bossId` (string): active boss identifier.
- `round` (number): current round count.
- `isWin` (boolean): whether win state has been reached.

### Boss Output
- `mood` (string enum): `disgusted | still_terrible | annoyingly_improved | reluctantly_considering | fine_you_win`
- `openingRoast` (string)
- `whyFail` (string)
- `top3Crimes` (string[3])
- `fixDirection` (string)
- `score` (number, 0-100)

## 4. Endpoint Definitions

### 4.1 POST /api/upload
Upload CV and return extracted text + session context.

Request:
- `multipart/form-data`
- field: `file`

Success Response (200):
```json
{
  "sessionId": "sess_001",
  "bossId": "layout_tyrant_v1",
  "fileName": "resume.pdf",
  "rawText": "...extracted cv text...",
  "extractStatus": "ok"
}
```

### 4.2 POST /api/challenge
Create first boss response for a session.

Request:
```json
{
  "sessionId": "sess_001",
  "resumeText": "...cv text...",
  "bossId": "layout_tyrant_v1"
}
```

Success Response (200):
```json
{
  "sessionId": "sess_001",
  "round": 1,
  "mood": "disgusted",
  "openingRoast": "This layout is visual noise.",
  "whyFail": "Your section hierarchy is unclear and hard to scan.",
  "top3Crimes": [
    "Header spacing is inconsistent",
    "Section order weakens readability",
    "Bullets are too dense"
  ],
  "fixDirection": "Normalize spacing, move experience above projects, and shorten bullets.",
  "isWin": false,
  "score": 34
}
```

### 4.3 POST /api/revision
Submit revised CV text and get next-round boss response.

Request:
```json
{
  "sessionId": "sess_001",
  "resumeText": "...revised cv text..."
}
```

Success Response (200):
```json
{
  "sessionId": "sess_001",
  "round": 2,
  "mood": "annoyingly_improved",
  "openingRoast": "Less chaotic, still not clean.",
  "whyFail": "Hierarchy improved, but scan flow is still uneven.",
  "top3Crimes": [
    "Contact block lacks emphasis",
    "Bullet rhythm still inconsistent",
    "Whitespace distribution remains uneven"
  ],
  "fixDirection": "Strengthen top header contrast, keep bullet lengths balanced, and align section spacing.",
  "isWin": false,
  "score": 61
}
```

### 4.4 GET /api/status
Return current session state for refresh/reconnect.

Request:
- query param: `sessionId`

Success Response (200):
```json
{
  "sessionId": "sess_001",
  "bossId": "layout_tyrant_v1",
  "round": 2,
  "isWin": false,
  "lastMood": "annoyingly_improved"
}
```

## 5. Error Contract
All errors MUST use this shape:
```json
{
  "error": {
    "code": "INVALID_FILE",
    "message": "Only PDF and DOCX are supported.",
    "details": {}
  }
}
```

Recommended error codes:
- `INVALID_FILE`
- `TEXT_EXTRACTION_FAILED`
- `SESSION_NOT_FOUND`
- `AI_TIMEOUT`
- `AI_UNAVAILABLE`
- `VALIDATION_ERROR`
- `INTERNAL_ERROR`

## 6. Timeout and Retry Rules
- AI request timeout MUST be enforced (recommended: 12-20 seconds).
- Backend SHOULD retry AI call once for transient failures.
- Frontend SHOULD show retry action for recoverable errors.

## 7. Fallback Mode Contract
When AI is unavailable, backend MUST return deterministic fallback output with the same schema as challenge/revision responses.

Additional optional field:
```json
{
  "fallback": true
}
```

## 8. State Transition Rules
- `round` MUST increment by 1 on each successful revision.
- `mood` SHOULD improve when meaningful structural changes are detected.
- `isWin` MUST become `true` when no high-value structural attack targets remain.
- Once `isWin=true`, backend MUST keep terminal win state for that session.

## 9. Frontend Integration Checklist
- Parse all required fields from challenge/revision responses.
- Enforce display of exactly 3 `top3Crimes` items.
- Route to win view when `isWin=true`.
- Handle timeout/fallback without breaking flow.

## 10. Backend Implementation Checklist
- Validate file types and payload structure.
- Guarantee stable field names and types.
- Enforce exactly 3 crime items in output.
- Preserve session state across rounds.

## 11. Compatibility and Change Policy
- Non-breaking additions are allowed (new optional fields only).
- Renaming/removing required fields MUST bump contract version.
- Version updates MUST be documented in PR description and release notes.
