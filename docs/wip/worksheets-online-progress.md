# Worksheets Online Mode - Progress

> Document de progression pour recovery en cas de crash

## Status: Phase 1 complete

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

## Prochaines etapes

1. User execute `pnpm db:migrate`
2. Phase 2: Types TypeScript + Schemas Zod
3. Phase 3: API Eleve
4. etc.

---

## Fichiers modifies/crees

### Phase 1

- `supabase/migrations/20251212000000_worksheets_online_mode.sql` (cree)
- `docs/wip/worksheets-online-progress.md` (cree)

---

## Derniere mise a jour

2025-12-12 - Phase 1 complete
