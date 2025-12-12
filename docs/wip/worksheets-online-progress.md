# Worksheets Online Mode - Progress

> Document de progression pour recovery en cas de crash

## Status: Phase 3 complete

---

## Decisions prises

| Aspect       | Decision                                                     |
| ------------ | ------------------------------------------------------------ |
| Distribution | Table `worksheet_assignment_students`                        |
| Corrections  | 2 niveaux (global + override par exercice)                   |
| Timing       | Eleves ne voient que les assignations actives et disponibles |
| Interface    | `/student/worksheets` + onglet dans cours                    |

---

## Phase 1: Migration DB - COMPLETE

### Fichier cree

`supabase/migrations/20251212000000_worksheets_online_mode.sql`

### Tables creees

- `worksheet_assignment_students` - Assignations eleves individuels
- `worksheet_assignment_exercise_settings` - Override corrections par exercice

### Colonnes ajoutees

- `worksheet_assignments.show_corrections` (BOOLEAN DEFAULT false)
- `worksheet_exercises.correction_visible` (BOOLEAN DEFAULT true)

### Fonction helper

- `can_access_assignment(UUID)` - Verifie acces avec checks timing/status

### RLS Policies

- Teachers: ALL sur leurs assignations
- Students: SELECT avec checks timing (status='active', available_from <= NOW())
- Admins: ALL

### Reviews effectuees

- [x] code-reviewer (Opus) - OK avec corrections
- [x] security-auditor (Opus) - OK apres ajout checks timing

---

## Phase 2: Types TypeScript + Schemas Zod - COMPLETE

### Fichiers modifies

- `src/lib/types/worksheets.ts`
- `src/lib/server/validation/worksheets.ts`

### Types ajoutes

**Row types:**

- `WorksheetAssignmentStudentRow`
- `WorksheetAssignmentExerciseSettingsRow`

**Insert/Update types:**

- `WorksheetAssignmentStudentInsert`
- `WorksheetAssignmentExerciseSettingsInsert`
- `WorksheetAssignmentExerciseSettingsUpdate`

**Student view types:**

- `StudentExerciseView`
- `StudentWorksheetView`
- `StudentWorksheetListItem`

**Colonnes ajoutees aux types existants:**

- `WorksheetExerciseRow.correction_visible`
- `WorksheetAssignmentRow.show_corrections`

### Schemas Zod ajoutes

**Request schemas:**

- `studentWorksheetsQuerySchema`
- `studentWorksheetParamSchema`
- `addAssignmentStudentsSchema`
- `removeAssignmentStudentSchema`
- `updateCorrectionSettingsSchema`
- `updateExerciseCorrectionSchema`
- `bulkUpdateExerciseCorrectionsSchema`
- `assignmentParamSchema`

**Response schemas:**

- `studentWorksheetListItemSchema`
- `studentWorksheetsListResponseSchema`
- `studentExerciseViewSchema`
- `studentWorksheetDetailResponseSchema`
- `assignmentStudentsResponseSchema`
- `addStudentsResponseSchema`
- `removeStudentResponseSchema`
- `correctionSettingsResponseSchema`
- `updateCorrectionSettingsResponseSchema`
- `updateExerciseCorrectionResponseSchema`

### Reviews effectuees

- [x] code-reviewer (Sonnet) - Excellent, ready to merge

---

## Phase 3: API Eleve - COMPLETE

### Fichiers crees

**Utilitaire de visibilite des corrections:**

- `src/lib/server/worksheets/correction-visibility.ts`

**Endpoints API:**

- `src/routes/api/student/worksheets/+server.ts` - Liste des worksheets assignees
- `src/routes/api/student/worksheets/[assignmentId]/+server.ts` - Detail d'une worksheet

### Fonctions implementees

**correction-visibility.ts:**

- `isCorrectionVisible(supabase, assignmentId, worksheetExerciseId)` - Visibilite pour un exercice
- `getCorrectionVisibilityMap(supabase, assignmentId, worksheetExerciseIds)` - Batch optimise
- `getCorrectionContext(supabase, assignmentId)` - Contexte global de visibilite

**GET /api/student/worksheets:**

- Liste paginee des assignations accessibles
- Filtrage par class_id optionnel
- Inclut exercise_count pour chaque worksheet
- Validation Zod des query params

**GET /api/student/worksheets/[assignmentId]:**

- Detail complet avec exercices resolus
- Resolution deterministe via seed (worksheetId + studentId)
- Support des instances pre-resolues
- Visibilite des corrections respectee (global + override par exercice)
- Validation Zod du param et de la reponse

### Logique de visibilite des corrections

1. Si `show_corrections = false` sur assignment -> pas de correction
2. Check timing via `correction_release_mode` (immediate, scheduled, after_due, manual)
3. Check override par exercice dans `worksheet_assignment_exercise_settings`
4. Sinon, utilise `worksheet_exercises.correction_visible` par defaut

### Securite

- Auth student via `requireRole(locals, 'student')`
- Acces verifie via `can_access_assignment(UUID)` RPC
- RLS policies en defense-in-depth
- Error messages en francais

### Reviews effectuees

- [x] code-reviewer (Sonnet) - Ready to merge
- [x] security-auditor (Sonnet) - Score 8.5/10, issues corrigees:
  - Added security comment documenting caller-responsibility pattern
  - Unified error messages to prevent information disclosure

---

## Prochaines etapes

1. Phase 4: API Enseignant (gestion des assignations individuelles, parametres corrections)
2. Phase 5: Interface eleve (page /student/worksheets)
3. Phase 6: Interface enseignant (gestion corrections)

---

## Fichiers modifies/crees

### Phase 1

- `supabase/migrations/20251212000000_worksheets_online_mode.sql` (cree)
- `docs/wip/worksheets-online-progress.md` (cree)

### Phase 2

- `src/lib/types/worksheets.ts` (modifie)
- `src/lib/server/validation/worksheets.ts` (modifie)

### Phase 3

- `src/lib/server/worksheets/correction-visibility.ts` (cree)
- `src/routes/api/student/worksheets/+server.ts` (cree)
- `src/routes/api/student/worksheets/[assignmentId]/+server.ts` (cree)

---

## Derniere mise a jour

2025-12-12 - Phase 3 complete
