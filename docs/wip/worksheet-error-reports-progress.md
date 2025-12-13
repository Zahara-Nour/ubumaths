# Worksheet Error Reports - Progress

> Document de progression pour recovery en cas de crash

## Status: ALL PHASES COMPLETE - Feature committed

---

## Decisions prises

| Aspect            | Decision                                                       |
| ----------------- | -------------------------------------------------------------- |
| Formulaire        | Minimal - description libre (10-1000 chars)                    |
| Notification prof | Via systeme existant (notifications persistantes)              |
| Workflow          | Complet: signale -> examine -> corrige/rejete -> notifie eleve |
| Visibilite        | Eleve voit ses signalements, prof voit tout                    |
| Rate limiting     | Non - contrainte 1 pending/exercice suffit                     |
| Email             | Non - uniquement in-app                                        |

---

## Phase 1: Migration DB - EN COURS

### Fichier cree

`supabase/migrations/20251213000000_create_worksheet_error_reports.sql`

### Table creee

`worksheet_error_reports`:

- `id` UUID PRIMARY KEY
- `assignment_id` UUID NOT NULL FK
- `worksheet_exercise_id` UUID NOT NULL FK
- `student_id` UUID NOT NULL FK
- `description` TEXT NOT NULL
- `status` TEXT DEFAULT 'pending' CHECK ('pending', 'fixed', 'rejected')
- `reviewed_by` UUID FK
- `reviewed_at` TIMESTAMPTZ
- `response` TEXT
- `created_at`, `updated_at` TIMESTAMPTZ

### Index unique partiel

`idx_wer_unique_pending` - Un seul pending par (assignment, exercise, student)

### Indexes de performance

- `idx_wer_assignment_id`
- `idx_wer_student_id`
- `idx_wer_worksheet_exercise_id`
- `idx_wer_pending`
- `idx_wer_exercise_status`

### RLS Policies (6)

1. Students INSERT - avec can_access_assignment()
2. Students SELECT - leurs propres signalements
3. **Students UPDATE - pending reports seulement (ajout apres review)**
4. Teachers SELECT - via worksheet_assignments -> worksheets -> created_by
5. Teachers UPDATE - meme chemin
6. Admins ALL - via is_admin()

### Reviews effectuees

- [x] code-reviewer (Sonnet) - Ready to merge
- [x] security-auditor (Sonnet) - Grade A-, corrections appliquees:
  - Ajout policy UPDATE pour students (pending only)
  - Documentation DELETE disabled (audit trail)

---

## Phase 2: Types TypeScript & Schemas Zod - COMPLETE

### Fichiers modifies

1. `src/lib/types/worksheets.ts`:
   - `ERROR_REPORT_STATUSES` constant
   - `ErrorReportStatus` type
   - `WorksheetErrorReportRow` interface
   - `WorksheetErrorReportInsert` interface
   - `WorksheetErrorReportUpdate` interface
   - `StudentErrorReportUpdate` interface
   - `StudentErrorReportView` interface
   - `TeacherErrorReportView` interface

2. `src/lib/server/validation/worksheets.ts`:
   - `errorReportStatusSchema` - enum validation
   - `createErrorReportSchema` - student create (10-1000 chars)
   - `updateStudentErrorReportSchema` - student update pending
   - `reviewErrorReportSchema` - teacher review (status + response)
   - `errorReportsQuerySchema` - list with pagination/filter
   - `errorReportParamSchema` - teacher URL params
   - `studentErrorReportParamSchema` - student URL params
   - Response schemas for list/create/review
   - Validation helper functions

---

## Phase 3: API Eleve - COMPLETE

### Fichiers crees

1. `src/routes/api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report/+server.ts` - POST endpoint
2. `src/routes/api/student/worksheets/[assignmentId]/reports/+server.ts` - GET endpoint

### Issues corrigees (apres code review)

- Fix: `requireRole` ne retourne pas `profile`, fetch separement pour notification
- Fix: Accent sur "Un élève"

---

## Phase 4: API Professeur - COMPLETE

### Fichiers crees

1. `src/routes/api/worksheets/[id]/assignments/[assignmentId]/reports/+server.ts` - GET endpoint (liste + pagination + filtres)
2. `src/routes/api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]/+server.ts` - PUT endpoint (review)

---

## Phase 5: Interface Eleve - COMPLETE

### Fichiers crees

1. `src/lib/components/worksheets/ReportStatusBadge.svelte`
2. `src/lib/components/worksheets/ReportDetailsPopover.svelte`
3. `src/lib/components/worksheets/ReportErrorDialog.svelte`
4. `src/lib/components/worksheets/ReportErrorButton.svelte`

### Fichiers modifies

1. `src/lib/components/student/worksheets/ExerciseListItem.svelte`
2. `src/lib/components/student/worksheets/ExerciseModal.svelte`
3. `src/routes/(protected)/dashboard/student/worksheets/[assignmentId]/+page.svelte`

---

## Phase 6: Interface Professeur - COMPLETE

### Fichiers crees

1. `src/lib/components/worksheets/teacher/ErrorReportsPanel.svelte`
2. `src/lib/components/worksheets/teacher/ErrorReportCard.svelte`
3. `src/lib/components/worksheets/teacher/ReviewReportDialog.svelte`

### Fichiers modifies

1. `src/routes/(protected)/dashboard/teacher/worksheets/[id]/+page.svelte`

---

## Phase 7: Quality Checks - COMPLETE

### Corrections TS appliquees

- Fix type assertion avec `as unknown as` pour joins Supabase
- Fix: `requireRole` returns `{ user }`, not `{ profile }` - fetch profile separately for notification

### Build

- ✅ Build reussi (`pnpm build` - 7m 31s)
- ✅ 0 erreurs TypeScript

### Commit

- ✅ `e778a61a` - `feat(worksheets): add error reporting system for student feedback`
- 20 fichiers modifies, +3,232 insertions, -47 deletions

---

## Derniere mise a jour

2025-12-13 - ALL PHASES COMPLETE - Feature committed to main
