# Parental Consent System - Progress Document

> **Feature**: RGPD Article 8 compliance for minors under 15
> **Started**: 2026-01-15
> **Status**: Phase 1 in progress

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

## Next Steps

### Phase 2: Consent Utilities & Middleware

- [ ] Create `src/lib/utils/consent.ts`
- [ ] Create `src/lib/server/middleware/consent.ts`
- [ ] Write unit tests

---

## Files Modified Summary

| File                                       | Action   |
| ------------------------------------------ | -------- |
| `supabase/migrations/20260115140000_*.sql` | Created  |
| `supabase/migrations/20260115140001_*.sql` | Created  |
| `supabase/migrations/20260115140002_*.sql` | Created  |
| `src/lib/types/database.ts`                | Modified |
