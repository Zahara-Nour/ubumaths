# Worksheet Error Reports - Plan d'Implementation

> **Statut**: En attente de validation
> **Date**: 2025-12-13
> **Specs**: [docs/features/worksheet-error-reports.md](../features/worksheet-error-reports.md)

---

## Phase 0: Specification TDD

### Comportements proposes

#### Eleve - Signalement

1. L'eleve peut signaler une erreur sur un exercice d'une fiche assignee
2. Le signalement contient une description libre (10-1000 caracteres)
3. Un seul signalement pending par exercice par eleve (anti-spam)
4. L'eleve peut voir ses propres signalements (statut + reponse prof)
5. L'eleve ne peut pas voir les signalements des autres eleves

#### Professeur - Gestion

6. Le prof recoit une notification quand un eleve signale une erreur
7. Le prof peut lister tous les signalements d'une assignation
8. Le prof peut filtrer par statut (pending, fixed, rejected)
9. Le prof peut marquer un signalement comme "corrige" ou "rejete"
10. Le prof peut ajouter une reponse optionnelle

#### Eleve - Feedback

11. L'eleve recoit une notification quand son signalement est traite
12. Le message de notification est neutre (pas de "rejete")

### Questions (RESOLUES)

- [x] Rate limiting supplementaire ? **Non** - contrainte 1 pending/exercice suffit
- [x] Notification email ? **Non** - uniquement in-app

---

## Phase 1: Migration DB

**Agent**: `supabase-expert` (Opus)
**Taches**:

- Creer migration `YYYYMMDDHHMMSS_worksheet_error_reports.sql`
- Table `worksheet_error_reports` avec colonnes specifiees
- RLS policies (student create/view own, teacher view/update own worksheets, admin all)
- Indexes pour performance

**Review**: `code-reviewer` (Sonnet)
**Security**: `security-auditor` (Sonnet) - RLS policies critiques
**Commit**: Apres reviews

---

## Phase 2: Types TypeScript & Schemas Zod

**Agent**: `typescript-expert` (Sonnet)
**Taches**:

- Types dans `src/lib/types/worksheets.ts`:
  - `WorksheetErrorReportRow`
  - `WorksheetErrorReportInsert`
  - `WorksheetErrorReportUpdate`
  - `StudentErrorReportView`
  - `TeacherErrorReportView`
- Schemas Zod dans `src/lib/server/validation/worksheets.ts`:
  - `createErrorReportSchema`
  - `updateErrorReportSchema`
  - `errorReportsQuerySchema`

**Review**: `code-reviewer` (Sonnet)
**Commit**: Apres review

---

## Phase 3: API Eleve

**Agent**: `backend-developer` (Opus)
**Taches**:

- `POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report`
  - Validation Zod
  - Check acces assignment
  - Check pas de pending existant
  - Insert + notification prof
- `GET /api/student/worksheets/[assignmentId]/reports`
  - Liste signalements propres
  - Avec statut et reponse

**Review**: `code-reviewer` (Sonnet)
**Security**: `security-auditor` (Sonnet) - endpoints sensibles
**Commit**: Apres reviews

---

## Phase 4: API Professeur

**Agent**: `backend-developer` (Opus)
**Taches**:

- `GET /api/worksheets/[id]/assignments/[assignmentId]/reports`
  - Pagination
  - Filtres (status)
  - Counts par statut
- `PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]`
  - Update status (fixed/rejected)
  - Ajout response optionnelle
  - Notification eleve

**Review**: `code-reviewer` (Sonnet)
**Security**: `security-auditor` (Sonnet)
**Commit**: Apres reviews

---

## Phase 5: Interface Eleve

**Agent**: `frontend-developer` (Sonnet) + `svelte-expert` (Sonnet)
**Taches**:

- `ReportErrorButton.svelte` - Bouton sur chaque exercice
- `ReportErrorDialog.svelte` - Modal formulaire
- `ReportStatusBadge.svelte` - Badge statut
- Integration dans `ExerciseDisplay.svelte`
- Affichage details signalement (click badge)

**Review**: `code-reviewer` (Sonnet)
**Accessibility**: `accessibility-tester` (Haiku)
**Commit**: Apres reviews

---

## Phase 6: Interface Professeur

**Agent**: `frontend-developer` (Sonnet) + `svelte-expert` (Sonnet)
**Taches**:

- Nouvel onglet "Signalements" dans page assignation
- `ErrorReportsPanel.svelte` - Liste avec filtres
- `ErrorReportCard.svelte` - Carte signalement
- `ReviewReportDialog.svelte` - Dialog resolution

**Review**: `code-reviewer` (Sonnet)
**Accessibility**: `accessibility-tester` (Haiku)
**Commit**: Apres reviews

---

## Phase 7: Quality Checks & Documentation

**Taches** (sans agent):

- `pnpm check` - Types
- `pnpm lint` - Linting
- `pnpm build` - Build complet
- Mise a jour documentation:
  - `docs/features/worksheet-error-reports.md` - Status: Production
  - `docs/architecture/database-schema.md` - Nouvelle table
  - `docs/features/worksheets.md` - Lien vers feature

**Commit final**: "feat(worksheets): add error reporting system"

---

## Documentation de progression

Fichier: `docs/wip/worksheet-error-reports-progress.md`

Mise a jour apres chaque phase avec:

- Fichiers crees/modifies
- Decisions prises
- Issues rencontrees
- Prochaines etapes

---

## Resume des agents par phase

| Phase | Agent Principal    | Model  | Reviewers                           |
| ----- | ------------------ | ------ | ----------------------------------- |
| 1     | supabase-expert    | Opus   | code-reviewer, security-auditor     |
| 2     | typescript-expert  | Sonnet | code-reviewer                       |
| 3     | backend-developer  | Opus   | code-reviewer, security-auditor     |
| 4     | backend-developer  | Opus   | code-reviewer, security-auditor     |
| 5     | frontend-developer | Sonnet | code-reviewer, accessibility-tester |
| 6     | frontend-developer | Sonnet | code-reviewer, accessibility-tester |
| 7     | -                  | -      | -                                   |

---

## Estimation

- **Phases**: 7
- **Commits**: 6 (1 par phase sauf phase 7 qui regroupe)
- **Reviews**: 10 (code-reviewer x6, security-auditor x3, accessibility-tester x2)

---

## Checklist validation

- [x] Phase 0 TDD validee par utilisateur (2025-12-13)
- [x] Questions clarifiees
- [x] Plan approuve

---

**Statut**: Phase 1 en cours
