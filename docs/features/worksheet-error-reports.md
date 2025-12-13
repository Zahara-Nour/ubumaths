# Worksheet Error Reports

> **Version**: 1.0.0
> **Status**: Implemented
> **Date**: 2025-12-13

---

## Overview

This feature allows students to report content errors (typos, incorrect answers, mathematical mistakes) in worksheet exercises. Teachers receive notifications and can review, respond to, and resolve these reports.

### Key Features

- **Student Reporting**: Simple form with free-text description
- **Teacher Notifications**: Uses existing notification system
- **Full Workflow**: Report -> Review -> Resolve/Reject -> Notify student
- **Privacy**: Students only see their own reports; teacher sees all

---

## User Workflows

### For Students: Reporting an Error

#### 1. Access Report Form

**Location**: On each exercise in the worksheet detail page (`/dashboard/student/worksheets/{assignmentId}`)

**UI Element**: Small "Signaler une erreur" button/icon on each exercise card

```
┌─────────────────────────────────────────────────────┐
│ Exercice 1: Calcul mental                           │
│                                                     │
│ Calculer: 7 × 8 = ?                                 │
│                                                     │
│ ▼ Voir la correction                                │
│                                        [🚩 Signaler]│
└─────────────────────────────────────────────────────┘
```

#### 2. Submit Report

**Dialog**: Modal with simple form

```
┌─────────────────────────────────────────────────────┐
│ Signaler une erreur                          [×]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Exercice: "Calcul mental" (Exercice 1)              │
│                                                     │
│ Decrivez l'erreur:                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ La correction indique 54 mais 7×8 = 56         │ │
│ │                                                 │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                   (min 10, max 1000)│
│                                                     │
│                    [Annuler]  [Envoyer le signalement]│
└─────────────────────────────────────────────────────┘
```

**Validation**:

- Description: 10-1000 characters
- One active report per exercise per student (prevent spam)

#### 3. View Own Reports

**Location**: Same exercise card shows report status badge

```
┌─────────────────────────────────────────────────────┐
│ Exercice 1: Calcul mental         [⏳ Signalement]  │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

**Status badges**:

- `⏳ Signalement` (pending) - Yellow
- `✓ Corrige` (fixed) - Green
- `✗ Rejete` (rejected) - Gray

**Click badge** to view details and teacher response (if any)

### For Teachers: Managing Reports

#### 1. Receive Notification

**Notification** (via existing system):

```
[🚩] Signalement d'erreur
Alice Dubois a signale une erreur dans "Calcul mental"
(Fiche: Exercices de multiplication - 5B)
[Voir le signalement →]
```

**Priority**: Normal (not urgent)
**Target**: Teacher who owns the worksheet

#### 2. View Reports Dashboard

**Location**: New tab in worksheet assignment detail page

**Route**: `/dashboard/teacher/worksheets/{id}/assignments/{assignmentId}?tab=signalements`

```
┌─────────────────────────────────────────────────────┐
│ Signalements (3)                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│ [Filter: Tous ▼] [Filter: En attente ▼]             │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ⏳ Exercice 1: Calcul mental                    │ │
│ │ Par: Alice Dubois • Il y a 2 heures             │ │
│ │ "La correction indique 54 mais 7×8 = 56"        │ │
│ │                          [Examiner →]           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ✓ Exercice 3: Fractions                         │ │
│ │ Par: Bob Martin • Il y a 1 jour                 │ │
│ │ "Le denominateur devrait etre 12, pas 8"        │ │
│ │ Resolu: "Erreur corrigee, merci !"              │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### 3. Review and Respond

**Dialog**: Detailed view with response options

```
┌─────────────────────────────────────────────────────┐
│ Signalement d'erreur                         [×]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Eleve: Alice Dubois (5B)                            │
│ Exercice: Calcul mental (Exercice 1)                │
│ Date: 13/12/2025 14:32                              │
│                                                     │
│ Description:                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ La correction indique 54 mais 7×8 = 56         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [Voir l'exercice dans la fiche →]                   │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ Reponse (optionnelle):                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│     [Rejeter]  [Marquer comme corrige]              │
└─────────────────────────────────────────────────────┘
```

**Actions**:

| Action      | Result                             | Student Notification                                    |
| ----------- | ---------------------------------- | ------------------------------------------------------- |
| **Corrige** | Status = `fixed`, closes report    | "Votre signalement a ete traite"                        |
| **Rejete**  | Status = `rejected`, closes report | "Votre signalement a ete examine" (no negative wording) |

**Response** (optional): Free text explaining what was done or why rejected

#### 4. View All Reports (Exercise Level)

**Alternative view**: From exercise bank, see all reports for a specific exercise across all assignments

**Route**: `/dashboard/teacher/exercises/{exerciseId}?tab=signalements`

Useful for:

- Identifying exercises with frequent errors
- Tracking if an issue persists after "fixing"

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR REPORT FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   STUDENT                        TEACHER                         │
│   ┌──────────────┐              ┌──────────────────┐            │
│   │ View Exercise│              │ Dashboard        │            │
│   └──────┬───────┘              └────────┬─────────┘            │
│          │                               │                       │
│          │ Click "Signaler"              │                       │
│          ▼                               │                       │
│   ┌──────────────┐                       │                       │
│   │ Report Form  │                       │                       │
│   │ (description)│                       │                       │
│   └──────┬───────┘                       │                       │
│          │                               │                       │
│          │ Submit                        │                       │
│          ▼                               │                       │
│   ┌──────────────────────────────────────┴──────────────────┐   │
│   │                    DATABASE                              │   │
│   │  worksheet_error_reports (INSERT)                        │   │
│   └──────────────────────────────────────┬──────────────────┘   │
│          │                               │                       │
│          │                               │                       │
│          │                               ▼                       │
│          │                      ┌──────────────────┐            │
│          │                      │ Notification     │            │
│          │                      │ (createSystemNot)│            │
│          │                      └────────┬─────────┘            │
│          │                               │                       │
│          │                               ▼                       │
│          │                      ┌──────────────────┐            │
│          │                      │ Review Report    │            │
│          │                      │ (dialog)         │            │
│          │                      └────────┬─────────┘            │
│          │                               │                       │
│          │                               │ Resolve/Reject        │
│          │                               ▼                       │
│   ┌──────┴───────────────────────────────────────────────────┐  │
│   │                    DATABASE                               │  │
│   │  worksheet_error_reports (UPDATE status, response)        │  │
│   └──────┬───────────────────────────────────────────────────┘  │
│          │                                                       │
│          │                                                       │
│          ▼                                                       │
│   ┌──────────────┐                                              │
│   │ Student      │                                              │
│   │ Notification │                                              │
│   └──────────────┘                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### New Table: `worksheet_error_reports`

```sql
CREATE TABLE worksheet_error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  assignment_id UUID NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  worksheet_exercise_id UUID NOT NULL REFERENCES worksheet_exercises(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report content
  description TEXT NOT NULL,

  -- Status workflow
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'fixed', 'rejected')),

  -- Teacher response
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  response TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT wer_unique_active UNIQUE (assignment_id, worksheet_exercise_id, student_id)
    WHERE (status = 'pending')
);

-- Indexes
CREATE INDEX idx_wer_assignment_id ON worksheet_error_reports(assignment_id);
CREATE INDEX idx_wer_student_id ON worksheet_error_reports(student_id);
CREATE INDEX idx_wer_worksheet_exercise_id ON worksheet_error_reports(worksheet_exercise_id);
CREATE INDEX idx_wer_status ON worksheet_error_reports(status) WHERE status = 'pending';
CREATE INDEX idx_wer_exercise_status ON worksheet_error_reports(worksheet_exercise_id, status);
```

**Note**: The unique constraint with WHERE clause allows only one pending report per student per exercise, but allows historical resolved reports.

#### RLS Policies

```sql
-- Students can create reports for exercises they can access
CREATE POLICY "Students can create error reports"
  ON worksheet_error_reports FOR INSERT
  WITH CHECK (
    auth.uid() = student_id
    AND can_access_assignment(assignment_id)
  );

-- Students can view their own reports
CREATE POLICY "Students can view own reports"
  ON worksheet_error_reports FOR SELECT
  USING (auth.uid() = student_id);

-- Teachers can view reports for their worksheets
CREATE POLICY "Teachers can view reports for own worksheets"
  ON worksheet_error_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      JOIN worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = assignment_id
      AND w.created_by = auth.uid()
    )
  );

-- Teachers can update reports for their worksheets
CREATE POLICY "Teachers can update reports for own worksheets"
  ON worksheet_error_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      JOIN worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = assignment_id
      AND w.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      JOIN worksheets w ON w.id = wa.worksheet_id
      WHERE wa.id = assignment_id
      AND w.created_by = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to error reports"
  ON worksheet_error_reports FOR ALL
  USING (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

### API Endpoints

#### Student Endpoints

**POST /api/student/worksheets/{assignmentId}/exercises/{exerciseId}/report**

Create an error report.

**Request**:

```typescript
{
	description: string; // 10-1000 chars
}
```

**Response**:

```typescript
{
  id: string,
  status: 'pending',
  created_at: string
}
```

**Errors**:

- 400: Invalid description length
- 400: Already have pending report for this exercise
- 403: Cannot access assignment
- 404: Exercise not found

---

**GET /api/student/worksheets/{assignmentId}/reports**

List student's own reports for an assignment.

**Response**:

```typescript
{
  reports: {
    id: string,
    worksheet_exercise_id: string,
    exercise_position: number,
    exercise_title: string,
    description: string,
    status: 'pending' | 'fixed' | 'rejected',
    response: string | null,
    created_at: string,
    reviewed_at: string | null
  }[]
}
```

#### Teacher Endpoints

**GET /api/worksheets/{id}/assignments/{assignmentId}/reports**

List all reports for an assignment.

**Query Parameters**:

- `status`: Filter by status ('pending', 'fixed', 'rejected', 'all')
- `page`: Pagination (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response**:

```typescript
{
  reports: {
    id: string,
    worksheet_exercise_id: string,
    exercise_position: number,
    exercise_title: string,
    student: {
      id: string,
      full_name: string
    },
    description: string,
    status: 'pending' | 'fixed' | 'rejected',
    response: string | null,
    created_at: string,
    reviewed_at: string | null
  }[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  counts: {
    pending: number,
    fixed: number,
    rejected: number
  }
}
```

---

**PUT /api/worksheets/{id}/assignments/{assignmentId}/reports/{reportId}**

Resolve or reject a report.

**Request**:

```typescript
{
  status: 'fixed' | 'rejected',
  response?: string  // Optional, max 1000 chars
}
```

**Response**:

```typescript
{
  id: string,
  status: 'fixed' | 'rejected',
  response: string | null,
  reviewed_at: string
}
```

**Side Effect**: Creates notification for student

---

**GET /api/exercises/{exerciseId}/reports**

List all reports for an exercise across all assignments (for exercise-level view).

**Response**: Same structure as assignment reports endpoint

### Notifications

#### Report Created (to Teacher)

**Template**:

```typescript
{
  title: 'Signalement d\'erreur',
  message: `<p><strong>${escapeHtml(studentName)}</strong> a signale une erreur dans l\'exercice "${escapeHtml(exerciseTitle)}"</p><p>Fiche: ${escapeHtml(worksheetTitle)} - ${escapeHtml(className)}</p>`,
  type: 'info',
  priority: 'normal',
  system_event_type: 'worksheet_error_reported',
  target_type: 'users',
  target_user_ids: [teacherId],
  action_label: 'Voir le signalement',
  action_url: `/dashboard/teacher/worksheets/${worksheetId}/assignments/${assignmentId}?tab=signalements&report=${reportId}`
}
```

#### Report Resolved (to Student)

**Template (Fixed)**:

```typescript
{
  title: 'Signalement traite',
  message: response
    ? `<p>Votre signalement sur "${escapeHtml(exerciseTitle)}" a ete traite.</p><p>Reponse: ${escapeHtml(response)}</p>`
    : `<p>Votre signalement sur "${escapeHtml(exerciseTitle)}" a ete traite. Merci pour votre contribution !</p>`,
  type: 'info',
  priority: 'normal',
  system_event_type: 'worksheet_error_resolved',
  target_type: 'users',
  target_user_ids: [studentId]
}
```

**Template (Rejected)** - Same message, neutral wording (no "rejected"):

```typescript
{
  title: 'Signalement examine',
  message: response
    ? `<p>Votre signalement sur "${escapeHtml(exerciseTitle)}" a ete examine.</p><p>Reponse: ${escapeHtml(response)}</p>`
    : `<p>Votre signalement sur "${escapeHtml(exerciseTitle)}" a ete examine. Merci pour votre vigilance !</p>`,
  // ...same as above
}
```

---

## Components

### Student Components

| Component                   | Location              | Purpose                           |
| --------------------------- | --------------------- | --------------------------------- |
| `ReportErrorButton.svelte`  | `student/worksheets/` | Button/icon to open report dialog |
| `ReportErrorDialog.svelte`  | `student/worksheets/` | Modal form to submit report       |
| `ReportStatusBadge.svelte`  | `student/worksheets/` | Badge showing report status       |
| `ReportDetailDialog.svelte` | `student/worksheets/` | View report details + response    |

### Teacher Components

| Component                   | Location      | Purpose                        |
| --------------------------- | ------------- | ------------------------------ |
| `ErrorReportsPanel.svelte`  | `worksheets/` | Tab panel listing all reports  |
| `ErrorReportCard.svelte`    | `worksheets/` | Individual report card in list |
| `ReviewReportDialog.svelte` | `worksheets/` | Dialog to review and respond   |

---

## Security Considerations

### Input Validation

```typescript
// Zod schemas
const createReportSchema = z.object({
	description: z
		.string()
		.min(10, 'Description trop courte (10 caracteres minimum)')
		.max(1000, 'Description trop longue (1000 caracteres maximum)')
});

const updateReportSchema = z.object({
	status: z.enum(['fixed', 'rejected']),
	response: z.string().max(1000).optional()
});
```

### XSS Prevention

- All user content (description, response) sanitized before display
- Use `escapeHtml()` in notification templates
- Render descriptions with `{@html sanitizedContent}` after DOMPurify

### Rate Limiting

- **Create report**: 10 per hour per student (prevent spam)
- **Reasonable since**: Only 1 pending report per exercise allowed anyway

### Privacy

- Students cannot see other students' reports
- Teachers only see reports for their own worksheets
- Admins can see all reports (for support)

---

## Implementation Plan

### Phase 1: Database Migration

- Create `worksheet_error_reports` table
- Add RLS policies
- Add indexes

### Phase 2: Types & Validation

- TypeScript types in `src/lib/types/worksheets.ts`
- Zod schemas in `src/lib/server/validation/worksheets.ts`

### Phase 3: Student API

- POST report endpoint
- GET own reports endpoint
- Notification on create

### Phase 4: Teacher API

- GET assignment reports endpoint
- PUT resolve/reject endpoint
- Notification on resolve

### Phase 5: Student UI

- Report button on ExerciseDisplay
- Report dialog
- Status badge
- Detail dialog

### Phase 6: Teacher UI

- Reports tab in assignment page
- Reports list with filters
- Review dialog

### Phase 7: Quality Checks

- Tests
- Build verification
- Documentation update

---

## Related Documentation

- [Worksheets Feature](worksheets.md) - Main worksheet documentation
- [Worksheets Online Mode](worksheets-online-mode.md) - Student consultation mode
- [Notification System](../ref/notifications/README.md) - Notification architecture
- [Chat Moderation](chat-moderation.md) - Similar report system (for reference)

---

## Changelog

### 2025-12-13 - Initial Specification

- Created feature specification document
- Defined database schema
- Defined API endpoints
- Defined UI components
- Defined notification templates

---

[Back to Features Index](README.md)
