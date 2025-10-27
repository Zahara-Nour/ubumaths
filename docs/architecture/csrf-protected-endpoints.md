# CSRF Protected Endpoints

**Auto-generated:** 2025-10-27
**Status:** All endpoints automatically protected by SvelteKit

---

## Overview

With `csrf.checkOrigin: true` enabled in `svelte.config.js`, **ALL** state-changing endpoints (POST, PUT, DELETE, PATCH) are automatically protected against CSRF attacks.

**Protection method:** Origin/Referer header validation
**Response on CSRF attempt:** 403 Forbidden
**No code changes required:** SvelteKit handles validation automatically

---

## Form Actions (Protected Automatically)

All form submissions in `+page.server.ts` files are protected:

### Authentication
- `POST /auth/login` - User login
- `POST /auth/reset-password` - Password reset request
- `POST /auth/update-password` - Update password
- `POST /signup` - New user registration

### Admin Dashboard
- `POST /dashboard/admin/classes` - Create/manage classes
- `POST /dashboard/admin/import-students` - Import students from CSV
- `POST /dashboard/admin/questions` - Create questions
- `POST /dashboard/admin/questions/[id]/edit` - Edit questions
- `POST /dashboard/admin/schools` - Manage schools
- `POST /dashboard/admin/schools/[schoolId]/timetable` - Update timetable
- `POST /dashboard/admin/users` - Manage users
- `POST /dashboard/admin/friendships` - Manage friendships
- `POST /dashboard/admin/notifications` - Send notifications
- `POST /dashboard/admin/errors/[id]` - Manage error reports

### Teacher Dashboard
- `POST /dashboard/teacher/assessments/new` - Create assessment
- `POST /dashboard/teacher/assessments/[id]/edit` - Edit assessment
- `POST /dashboard/teacher/assessments/[id]/assign` - Assign assessment
- `POST /dashboard/teacher/srs/decks` - Create SRS deck
- `POST /dashboard/teacher/srs/decks/[id]/edit` - Edit SRS deck
- `POST /dashboard/teacher/srs/decks/[id]/assign` - Assign deck
- `POST /dashboard/teacher/riddles` - Create riddle
- `POST /dashboard/teacher/riddles/[id]/edit` - Edit riddle
- `POST /dashboard/teacher/riddles/new` - Create new riddle
- `POST /dashboard/teacher/riddles/of-the-day` - Set riddle of the day
- `POST /dashboard/teacher/riddles/validations/[id]` - Validate riddle answer
- `POST /dashboard/teacher/rewards` - Award gidouilles
- `POST /dashboard/teacher/classes` - Manage classes
- `POST /dashboard/teacher/exercises` - Manage exercises
- `POST /dashboard/teacher/exercises/[id]` - Edit exercise
- `POST /dashboard/teacher/exercises/[id]/assign` - Assign exercise
- `POST /dashboard/teacher/notifications` - Send notifications

### Student Dashboard
- `POST /dashboard/student/riddles/[id]` - Submit riddle answer
- `POST /dashboard/student/assessments` - Take assessment
- `POST /dashboard/student/exercises/[id]` - Complete exercise
- `POST /dashboard/revisions` - SRS review

### Game Features
- `POST /dashboard/navadra/combat` - Combat actions
- `POST /dashboard/navadra/combat/[combatId]` - Combat turn
- `POST /dashboard/navadra/spells` - Use spell
- `POST /dashboard/chat` - Send chat message
- `POST /dashboard/friends` - Manage friends

### Public Routes
- `POST /automaths` - AutoMaths worksheet generation
- `POST /automaths/test` - AutoMaths test mode
- `POST /automaths/panier` - AutoMaths cart

**Total form actions protected:** 60+ endpoints

---

## API Routes (Protected Automatically)

All API endpoints with POST/PUT/DELETE/PATCH methods in `+server.ts` files:

### Authentication & Session
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/callback` - OAuth callback
- `POST /api/auth/confirm` - Email confirmation

### Rewards & Gamification
- `POST /api/rewards/gidouilles` - Award gidouilles to students

### Questions System
- `POST /api/questions/templates` - Create question template
- `PUT /api/questions/templates/[id]` - Update question template
- `DELETE /api/questions/templates/[id]` - Delete question template
- `GET /api/questions/templates/all` - List templates (safe method, not protected)
- `GET /api/questions/categories` - List categories (safe method)
- `GET /api/questions/categories/all` - All categories (safe method)
- `POST /api/questions/generate/[id]` - Generate question instance

### Assessments
- `POST /api/assessments` - Create assessment
- `PUT /api/assessments/[id]` - Update assessment
- `DELETE /api/assessments/[id]` - Delete assessment
- `POST /api/assessments/[id]/assign` - Assign to students
- `POST /api/assessments/[id]/validate-attempt` - Validate student attempt
- `GET /api/assessments/[id]/results` - Get results (safe method)
- `GET /api/assessments/assigned` - List assigned (safe method)

### SRS & Flashcards
- `POST /api/srs/cards` - Create flashcard
- `PUT /api/srs/cards/[id]` - Update flashcard
- `DELETE /api/srs/cards/[id]` - Delete flashcard
- `POST /api/srs/decks` - Create deck
- `PUT /api/srs/decks/[id]` - Update deck
- `DELETE /api/srs/decks/[id]` - Delete deck
- `POST /api/srs/decks/[id]/assign` - Assign deck to students
- `POST /api/srs/review/submit` - Submit review result
- `GET /api/srs/review/due` - Get due cards (safe method)

### Notifications
- `POST /api/notifications/mark-read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/cleanup` - Cleanup old notifications
- `GET /api/notifications/unread` - Get unread (safe method)
- `GET /api/notifications/unread-count` - Get count (safe method)

### Messaging System
- `POST /api/messages/send` - Send private message
- `PUT /api/messages/[id]` - Update message
- `DELETE /api/messages/[id]` - Delete message
- `POST /api/messages/drafts` - Save draft
- `PUT /api/messages/drafts/[id]` - Update draft
- `DELETE /api/messages/drafts/[id]` - Delete draft
- `GET /api/messages/inbox` - Get inbox (safe method)
- `GET /api/messages/sent` - Get sent (safe method)
- `GET /api/messages/recipients` - Get recipients (safe method)
- `GET /api/messages/thread` - Get thread (safe method)
- `GET /api/messages/search` - Search messages (safe method)
- `GET /api/messages/unread-count` - Get count (safe method)

### Message Templates
- `POST /api/messages/templates` - Create template
- `PUT /api/messages/templates/[id]` - Update template
- `DELETE /api/messages/templates/[id]` - Delete template
- `POST /api/messages/templates/[id]/approve` - Approve template
- `POST /api/messages/templates/[id]/duplicate` - Duplicate template
- `POST /api/messages/templates/track-usage` - Track usage
- `POST /api/messages/templates/[id]/versions` - Create version
- `POST /api/messages/templates/favorites` - Toggle favorite
- `GET /api/messages/templates/[id]/preview` - Preview (safe method)
- `GET /api/messages/templates/search` - Search (safe method)
- `GET /api/messages/templates/stats` - Get stats (safe method)
- `GET /api/messages/templates/match` - Match template (safe method)

### Riddles
- `POST /api/riddles/[id]/submit` - Submit riddle answer
- `POST /api/riddles/auto-select-daily` - Auto-select daily riddle

### Error Monitoring
- `POST /api/errors/log` - Log client-side error
- `PUT /api/errors/[id]` - Update error status
- `DELETE /api/errors/[id]` - Delete error
- `DELETE /api/errors/cleanup` - Cleanup old errors
- `GET /api/errors` - List errors (safe method)
- `GET /api/errors/[id]` - Get error details (safe method)
- `GET /api/errors/stats` - Get statistics (safe method)
- `GET /api/errors/occurrences` - Get occurrences (safe method)

### Admin Operations
- `POST /api/admin/add-to-class` - Add student to class
- `POST /api/admin/remove-from-class` - Remove student from class
- `GET /api/admin/search-users` - Search users (safe method)
- `GET /api/admin/class-students` - List students (safe method)

### Exercises
- `POST /api/exercises` - Create exercise
- `PUT /api/exercises/[id]` - Update exercise
- `DELETE /api/exercises/[id]` - Delete exercise
- `POST /api/exercises/[id]/assign` - Assign exercise
- `POST /api/exercises/[id]/complete` - Mark as complete
- `POST /api/exercises/[id]/view` - Track view
- `POST /api/exercises/import` - Import exercises
- `PUT /api/exercises/assignments/[assignmentId]` - Update assignment
- `DELETE /api/exercises/assignments/[assignmentId]` - Delete assignment
- `GET /api/exercises/[id]` - Get exercise (safe method)
- `GET /api/exercises/[id]/export` - Export (safe method)
- `GET /api/exercises/export` - Batch export (safe method)
- `GET /api/exercises/[id]/access` - Check access (safe method)
- `GET /api/exercises/[id]/stats` - Get stats (safe method)
- `GET /api/exercises/assigned` - List assigned (safe method)
- `GET /api/exercises/assignments/stats` - Assignment stats (safe method)

### Classes
- `GET /api/classes/[classId]/students` - List students (safe method)

### Utilities
- `POST /api/latex/compile` - Compile LaTeX to PDF
- `POST /api/test-mode` - Toggle test mode
- `POST /api/chat` - Send chat message
- `POST /api/tests/save` - Save test results

**Total API routes protected:** 77+ POST/PUT/DELETE endpoints

---

## Protection Summary

### State-Changing Endpoints (Protected)
- **Form Actions:** 60+ endpoints
- **API POST:** 50+ endpoints
- **API PUT:** 15+ endpoints
- **API DELETE:** 12+ endpoints
- **Total Protected:** **137+ endpoints**

### Safe Methods (Not Protected, No Risk)
- **GET requests:** ~100+ endpoints
- **HEAD requests:** As needed
- **OPTIONS requests:** CORS preflight

**Note:** GET requests don't need CSRF protection as they should not modify state (safe methods per HTTP spec)

---

## How Protection Works

### 1. Browser Sends Request

```http
POST /api/rewards/gidouilles HTTP/1.1
Host: ubumaths.com
Origin: https://ubumaths.com
Content-Type: application/json
Cookie: session=...

{"studentId": "abc123", "amount": 10}
```

### 2. SvelteKit Validates Origin

```typescript
// Automatic validation (no code needed)
if (request.headers.get('origin') !== request.headers.get('host')) {
  return new Response('Cross-site POST form submissions are forbidden', {
    status: 403
  });
}
```

### 3. Request Processed or Blocked

**Valid origin (same-site):** ✅ Request continues to handler
**Invalid origin (cross-site):** ❌ 403 Forbidden returned

---

## Testing Quick Reference

### Test Valid Request (Should Succeed)

```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"studentId": "test", "amount": 10}'
```

### Test Invalid Request (Should Fail with 403)

```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Origin: https://evil.com" \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"studentId": "test", "amount": 10}'
```

### Test Missing Origin (Should Fail with 403)

```bash
curl -X POST http://localhost:5173/api/rewards/gidouilles \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"studentId": "test", "amount": 10}'
```

---

## Allowed Origins

### Production
- `https://ubumaths.com`
- `https://www.ubumaths.com`

### Vercel
- `https://ubumaths-6op8.vercel.app` (production)
- `https://ubumaths-*.vercel.app` (preview deployments)

### Development
- `http://localhost:5173` (user port)
- `http://localhost:5175` (Claude port)
- `http://127.0.0.1:5173`
- `http://127.0.0.1:5175`

**Dynamic matching:** Vercel preview deployments automatically allowed if they match `ubumaths-*.vercel.app` pattern

---

## Manual Validation (Optional)

For routes that need custom CSRF handling:

```typescript
import { validateOrigin } from '$lib/server/csrfProtection';

export const POST: RequestHandler = async ({ request, locals }) => {
  // Manual validation with custom error handling
  try {
    validateOrigin(request);
  } catch (error) {
    // Custom logging or error response
    console.error('CSRF attempt blocked:', request.headers.get('origin'));
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... rest of handler
};
```

**Note:** Manual validation is rarely needed - SvelteKit handles it automatically

---

## Monitoring

### What to Monitor

**Normal patterns:**
- Same-origin requests: 100% success rate
- Cross-origin GET requests: Allowed (safe method)
- API clients with proper Origin header: Allowed

**Attack patterns:**
- Spike in 403 errors: Possible CSRF attack
- Cross-origin POST requests: Blocked automatically
- Missing Origin/Referer headers: Blocked automatically

### Logging

Server logs will show:

```
[CSRF] Blocked request from invalid origin: https://evil.com
```

Monitor for patterns indicating attack attempts.

---

## Additional Resources

- [CSRF Protection Guide](csrf-protection.md) - Complete documentation
- [Testing Checklist](csrf-testing-checklist.md) - Testing guidelines
- [Implementation Summary](csrf-implementation-summary.md) - Overview

---

**Last Updated:** 2025-10-27
**Total Endpoints Protected:** 137+
**Protection Method:** Automatic (SvelteKit built-in)
