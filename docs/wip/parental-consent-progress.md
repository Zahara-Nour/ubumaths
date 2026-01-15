# Parental Consent System - Progress Document

> **Feature**: RGPD Article 8 compliance for minors under 15
> **Started**: 2026-01-15
> **Status**: Phase 7 in progress

---

## Decisions Confirmed

| Decision                 | Value                                        |
| ------------------------ | -------------------------------------------- |
| Grades requiring consent | `'6'`, `'5'`, `'4'`, `'3'`, `'2'`            |
| Unknown grade            | Consent required (safe default)              |
| Existing students        | Retroactive consent with 30-day grace period |
| Access before consent    | Read-only (view only, no actions)            |
| Email trigger            | Manual by teacher                            |
| Parent email collection  | Both bulk CSV and individual edit            |
| Token expiry             | 7 days                                       |
| Max emails per student   | 5                                            |

---

## Phase 1: Database Foundation - COMPLETED

### Files Created

1. `supabase/migrations/20260115140000_add_consent_fields_to_profiles.sql`

   - Added `consent_required`, `consent_granted_at`, `consent_grace_period_ends`
   - Added indexes for filtering

2. `supabase/migrations/20260115140001_create_parental_consents_table.sql`

   - Created `consent_status` enum
   - Created `parental_consents` table with RLS policies
   - Teachers can manage consents for their students
   - Admins have full access

3. `supabase/migrations/20260115140002_add_parent_email_to_pending_students.sql`

   - Added `parent_email` column with email format constraint

4. `src/lib/types/database.ts`
   - Added `consent_status` enum
   - Added `parental_consents` table types
   - Added consent fields to `profiles`
   - Added `parent_email` to `pending_students`

### Database Schema

```
profiles (modified)
├── consent_required: BOOLEAN (default FALSE)
├── consent_granted_at: TIMESTAMPTZ (null until granted)
└── consent_grace_period_ends: TIMESTAMPTZ (null or deadline)

parental_consents (new)
├── id: UUID
├── student_id: UUID → profiles
├── parent_email: TEXT (required, validated)
├── parent_name: TEXT (optional)
├── status: consent_status (pending/granted/expired)
├── consent_token: UUID (unique, for verification link)
├── expires_at: TIMESTAMPTZ (default NOW + 7 days)
├── consent_given_at: TIMESTAMPTZ
├── consent_ip: INET
├── consent_user_agent: TEXT
├── email_count: INTEGER (max 5)
└── last_email_sent_at: TIMESTAMPTZ

pending_students (modified)
└── parent_email: TEXT (optional, validated)
```

---

## Phase 2: Consent Utilities & Middleware - COMPLETED

### Files Created

1. `src/lib/utils/consent.ts`

   - `GRADES_REQUIRING_CONSENT` constant
   - `requiresParentalConsent(grade)` - check if grade needs consent
   - `hasValidConsent(profile)` - check if student has valid consent
   - `isInGracePeriod(profile)` - check if in grace period
   - `getConsentStatus(profile)` - get status object for UI

2. `src/lib/server/middleware/consent.ts`

   - `RestrictedAction` type for action types
   - `canPerformAction(profile, action)` - check permission
   - `requireConsent(profile, action)` - throw 403 if unauthorized
   - `hasConsentFields(profile)` - type guard

3. `src/lib/utils/consent.test.ts`
   - 73 comprehensive unit tests
   - All edge cases covered
   - Integration scenarios validated

---

## Phase 3: Access Control Integration - COMPLETED

### Changes Made

1. `src/routes/(protected)/+layout.server.ts`

   - Added consent status to layout return data
   - Passes `consentStatus` object to child routes for UI display

2. **15+ API Endpoints Modified** (added `requireConsent()` checks):

   - `/api/exercises/[id]/complete` - submit_exercise
   - `/api/student/chapters/[id]/quiz/submit` - submit_exercise
   - `/api/python-exercises/[id]/submit` - submit_exercise
   - `/api/riddles/[id]/submit` - submit_exercise
   - `/api/srs/review/submit` - submit_exercise
   - `/api/chat` - send_message
   - `/api/messages/send` - send_message
   - `/api/games/2048/scores` - play_games
   - `/api/games/minesweeper/start` - play_games
   - `/api/vip-cards/choose` - earn_rewards
   - `/api/vip-cards/purchase` - purchase_items
   - `/api/vip-cards/request-activation` - purchase_items
   - `/api/vip-cards/use-consumable` - purchase_items
   - `/api/rewards/draw-vip-cards` - earn_rewards
   - `/api/marketplace/trades` - purchase_items

3. **Security Audit (Opus)** - Passed
   - Validated consent checking logic
   - Identified need for SECURITY DEFINER function (Phase 4)
   - No critical vulnerabilities found

---

## Phase 4: Parent Consent Flow - IN PROGRESS

### Files Created

1. `src/lib/email-templates/parental-consent.ts`

   - `CONSENT_EMAIL_SUBJECT` - email subject line
   - `getConsentEmailText()` - plain text version
   - `getConsentEmailHtml()` - styled HTML version
   - `getConsentLink()` - builds consent URL with token

2. `supabase/migrations/20260115141821_add_consent_verification_function.sql`

   - `grant_parental_consent(token, ip, user_agent)` - SECURITY DEFINER function
   - `get_consent_info(token)` - returns student info for consent page
   - Anonymous access granted for parents without authentication

3. `src/routes/(public)/consent/[token]/+page.server.ts`

   - Load function calls `get_consent_info()` RPC
   - Form action calls `grant_parental_consent()` RPC
   - Handles token validation, expiry, already-granted cases

4. `src/routes/(public)/consent/[token]/+page.svelte`

   - Displays student info (name, grade, school, teacher)
   - Shows RGPD explanation
   - "J'autorise l'acces" button to grant consent
   - Error states for expired/invalid tokens

5. `src/routes/(public)/consent/success/+page.svelte`

   - Success confirmation page after consent granted
   - Lists what student can now do

6. `src/routes/api/consent/send-email/+server.ts`

   - Teacher-only endpoint
   - Creates/updates parental_consents record
   - Sends email via Gmail API
   - Respects 5 email limit per student

7. `src/lib/server/google/gmail.ts`

   - Added `sendConsentEmail()` function

8. `src/lib/types/database.ts`
   - Added `get_consent_info` function type
   - Added `grant_parental_consent` function type

### Remaining for Phase 4

- [ ] Write tests for consent flow

---

## Phase 5: Teacher Dashboard - COMPLETED

### Files Created

1. `src/routes/(protected)/dashboard/teacher/consent/+page.server.ts`

   - Load function fetches students requiring consent by class
   - Calculates consent status (granted, pending, grace_period, expired)
   - Includes stats for dashboard overview
   - Form action for updating parent email with teacher-student verification

2. `src/routes/(protected)/dashboard/teacher/consent/+page.svelte`

   - Tabbed interface by class
   - Status badges with color coding
   - Inline parent email editing
   - Send/resend consent email buttons
   - Email count tracking (n/5)
   - RGPD compliance help section

### Security Fixes Applied

- Added `verifyTeacherStudent()` check in updateParentEmail action
- Fixed cumulative email limit check across all consent records
- Email normalization (lowercase, trim)

---

## Phase 6: UI Read-Only Mode - COMPLETED

### Files Created

1. `src/lib/components/ConsentBanner.svelte`

   - Warning banner for students in grace period
   - Error banner for students without consent (read-only mode)
   - Shows days remaining in grace period

2. `src/lib/stores/consent.svelte.ts`

   - Client-side consent store using Svelte 5 runes
   - Exports `hasFullAccess`, `isReadOnly`, `isInGracePeriod`
   - `getDisabledTooltip()` for button tooltip text

3. `src/lib/components/ConsentButton.svelte`
   - Consent-aware button wrapper
   - Automatically disables when `consent.isReadOnly` is true
   - Shows tooltip explaining why action is disabled

### Files Modified

1. `src/routes/(protected)/dashboard/student/+layout.svelte`

   - Added ConsentBanner integration
   - Hydrates consent store on mount

2. `src/routes/(protected)/dashboard/student/exercises/[id]/+page.svelte`

   - Completion toggle uses ConsentButton

3. `src/routes/(protected)/dashboard/student/marketplace/+page.svelte`

   - "Nouvelle annonce" button uses ConsentButton

4. `src/lib/components/riddles/RiddleCard.svelte`

   - Submit button uses ConsentButton

5. `src/lib/components/vip-cards/VipCardShopSection.svelte`

   - Purchase buttons use ConsentButton
   - Card click disabled when consent missing

6. `src/lib/components/student/worksheets/ExerciseModal.svelte`
   - Mastery status buttons (desktop + mobile) use ConsentButton

---

## Files Modified Summary

| File                                                         | Action   |
| ------------------------------------------------------------ | -------- |
| `supabase/migrations/20260115140000_*.sql`                   | Created  |
| `supabase/migrations/20260115140001_*.sql`                   | Created  |
| `supabase/migrations/20260115140002_*.sql`                   | Created  |
| `supabase/migrations/20260115141821_*.sql`                   | Created  |
| `src/lib/types/database.ts`                                  | Modified |
| `src/lib/utils/consent.ts`                                   | Created  |
| `src/lib/server/middleware/consent.ts`                       | Created  |
| `src/lib/utils/consent.test.ts`                              | Created  |
| `src/routes/(protected)/+layout.server.ts`                   | Modified |
| `src/routes/api/.../+server.ts` (15+ files)                  | Modified |
| `src/lib/email-templates/parental-consent.ts`                | Created  |
| `src/lib/server/google/gmail.ts`                             | Modified |
| `src/routes/(public)/consent/[token]/*`                      | Created  |
| `src/routes/(public)/consent/success/*`                      | Created  |
| `src/routes/api/consent/send-email/*`                        | Created  |
| `src/routes/(protected)/.../consent/*`                       | Created  |
| `src/lib/components/ConsentBanner.svelte`                    | Created  |
| `src/lib/stores/consent.svelte.ts`                           | Created  |
| `src/lib/components/ConsentButton.svelte`                    | Created  |
| `src/routes/(protected)/dashboard/student/+layout.svelte`    | Modified |
| `src/lib/components/riddles/RiddleCard.svelte`               | Modified |
| `src/lib/components/vip-cards/VipCardShopSection.svelte`     | Modified |
| `src/lib/components/student/worksheets/ExerciseModal.svelte` | Modified |
