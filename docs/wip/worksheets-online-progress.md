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

## Phase 4: API Enseignant - COMPLETE

### Fichiers crees

- `src/routes/api/worksheets/[id]/assignments/[assignmentId]/students/+server.ts`
- `src/routes/api/worksheets/[id]/assignments/[assignmentId]/corrections/+server.ts`

### Endpoints

**Students:**

- `GET` - Liste des eleves assignes individuellement
- `POST` - Ajouter des eleves individuels (batch jusqu'a 200)
- `DELETE` - Retirer un eleve individuel

**Corrections:**

- `GET` - Parametres de correction (global + overrides)
- `PUT` - Mise a jour (global, par exercice, ou bulk)

### Reviews effectuees

- [x] code-reviewer (Sonnet) - Good with pattern suggestions
- [x] security-auditor (Sonnet) - APPROVED (0 critical, 0 high)

---

## Phase 5: Synchronisation Instances - SKIPPED

**Raison:** Non necessaire avec l'architecture choisie.

L'API eleve resout les exercices dynamiquement avec un seed deterministe (worksheetId + studentId), ce qui garantit:

- Memes valeurs parametrees pour chaque eleve
- Mise a jour automatique quand exercices ajoutes/modifies/supprimes
- Pas besoin de pre-generer ou synchroniser les instances

---

## Phase 6: Interface Eleve - Liste - COMPLETE

### Fichiers crees

- `src/routes/(protected)/dashboard/student/worksheets/+page.server.ts`
- `src/routes/(protected)/dashboard/student/worksheets/+page.svelte`
- `src/lib/components/student/worksheets/WorksheetCard.svelte`

### Fonctionnalites implementees

- Page liste avec grille responsive 1-2-3 colonnes
- Filtre par classe (MySelect) - affiche seulement si >1 classe
- Pagination avec navigation
- WorksheetCard avec:
  - Badge type (worksheet, exam, quiz, homework, assessment)
  - Badge corrections disponibles
  - Nombre d'exercices
  - Date limite avec formatage relatif francais et indicateur urgence
  - Bouton "Voir la fiche"
- Loading skeletons pendant chargement
- Empty state contextuel (avec/sans filtres)
- Validation Zod des query params avec graceful degradation

### Reviews effectuees

- [x] svelte-autofixer - No issues
- [x] code-reviewer (Sonnet) - Excellent, ready to merge

---

## Phase 7: Interface Eleve - Detail - COMPLETE

### Fichiers crees

- `src/routes/(protected)/dashboard/student/worksheets/[assignmentId]/+page.server.ts`
- `src/routes/(protected)/dashboard/student/worksheets/[assignmentId]/+page.svelte`
- `src/lib/components/student/worksheets/WorksheetHeader.svelte`
- `src/lib/components/student/worksheets/ExerciseDisplay.svelte`

### Fonctionnalites implementees

- Page detail avec breadcrumb navigation
- WorksheetHeader avec titre, badges, classe, date, description, instructions
- ExerciseDisplay avec enonce markdown et correction collapsible
- Validation UUID avec redirect sur erreur
- Accessibilite (ARIA labels)

### Reviews effectuees

- [x] svelte-autofixer - No critical issues
- [x] code-reviewer (Sonnet) - Excellent, ready to merge

---

## Prochaines etapes

1. Phase 8: Integration Cours
2. Phase 9: Interface Enseignant - Modifications
3. Phase 10: Quality Checks + Documentation

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

### Phase 4

- `src/routes/api/worksheets/[id]/assignments/[assignmentId]/students/+server.ts` (cree)
- `src/routes/api/worksheets/[id]/assignments/[assignmentId]/corrections/+server.ts` (cree)

---

## Derniere mise a jour

2025-12-12 - Phase 4 complete, Phase 5 skipped
