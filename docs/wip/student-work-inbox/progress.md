# Inbox unifié "Mon travail" — élève

## Objectif

Centraliser dans une seule surface (page + widget home) tout le travail assigné à un élève, peu importe sa source (assessment, exercice à l'unité, worksheet, python). Aujourd'hui ces 4 systèmes vivent dans 4 pages séparées, et 3 d'entre eux ne sont même pas dans la navigation principale → forte fragmentation, items orphelins.

## Spec TDD validée par l'utilisateur (2026-05-11)

### A — Agrégation des sources

- **A1** — `getStudentWorkInbox(userId)` retourne tous les items assignés via :
  - Assessment : direct (`student_id`) OU classe active (`class_id` ∈ classes actives de l'élève)
  - Exercise à l'unité : direct OU classe active OU `assigned_to_type = 'public'`
  - Worksheet : `worksheet_assignment_students` direct OU `class_id` ∈ classes actives
  - Python : direct OU classe active
- **A2** — Dédoublonnage par `source + id` : un item assigné direct + via classe n'apparaît qu'une fois (préférer le direct si conflit).
- **A3** — Exclus : `is_active = false`, assessments `status != 'active'`/'published'.

### S — États "Fait"

- **S1** — Assessment : au moins une `test_sessions` avec `completed_at` non null pour cette assignation+élève
- **S2** — Python : au moins une `python_exercise_submissions` pour ce student+exercise (peu importe `is_correct`)
- **S3** — Exercise à l'unité : `exercise_completions.completed_at` non null
- **S4** — Worksheet : `worksheet_instances.submitted_at` non null (self-déclaré, voir Phase 2)

### T — Tri et sections

- **T1** — Sections dans l'ordre :
  1. **En retard** (`dueAt < now`, pas fait)
  2. **Cette semaine** (`dueAt` entre maintenant et +7j)
  3. **Plus tard** (`dueAt > +7j`)
  4. **Sans échéance** (`dueAt == null`) — collapsed
  5. **Fait cette semaine** (`doneAt` dans les 7 derniers jours) — collapsed
- **T2** — Items "Fait" : visibles 7 jours, puis archivage silencieux
- **T3** — Items "En retard" : visibles jusqu'à action, puis archivage silencieux après 30 jours
- **T4** — Assessments avec `closes_at` passé : badge "Fermé" non cliquable, restent visibles

### E — Cas limites

- **E1** — Aucun assigné : empty state "Rien d'assigné" + suggestions (liens vers pratique libre)
- **E2** — Uniquement des items "Sans échéance" : section auto-expand
- **E3** — Item "Fait" hier mais en retard avant : remonte en "Fait récemment", disparaît de "En retard"

## Décisions UX validées

- **2 états** (todo/done), pas 3. Indicateur visuel discret pour "déjà ouvert" (via `last_viewed_at`/`accessed_at`)
- **CTA par source** : `Commencer/Reprendre` (assessment), `Coder` (python), `Travailler` (exercise), `Consulter` + `Imprimer` (worksheet)
- **Widget home** : 3-5 items max, uniquement "En retard" + "Cette semaine" + lien "Voir tout (N)"

## Phases

| Phase                                      | Statut    | Agent                         |
| ------------------------------------------ | --------- | ----------------------------- |
| 0 — Spec TDD                               | ✅ Validé | —                             |
| 1 — Backend agrégateur + types + tests     | ✅ Done   | `backend-developer` (Opus)    |
| 2 — "J'ai fait" worksheets & exos (API+UI) | ✅ Done   | `fullstack-developer` (Opus)  |
| 3 — Page `/dashboard/student/travail`      | ⏳        | `frontend-developer` (Opus)   |
| 4 — Widget home + nav                      | ⏳        | `frontend-developer` (Sonnet) |
| 5 — Quality checks + commit final          | ⏳        | manuel                        |

## Type cible (WorkItem)

```ts
export type WorkSource = 'assessment' | 'exercise' | 'worksheet' | 'python';
export type WorkStatus = 'todo' | 'done';

export interface WorkItem {
	source: WorkSource;
	itemId: string; // exercise.id, assessment.id, worksheet.id, python_exercise.id
	assignmentId: string; // *_assignments.id (pour lookup completion)
	title: string;
	classId: string | null; // null si direct ou public
	className: string | null;
	dueAt: string | null; // ISO ; null = sans échéance
	status: WorkStatus;
	viewed: boolean; // true si last_viewed_at/accessed_at non null (false pour assessments/python)
	doneAt: string | null; // ISO ; pour bucket "Fait cette semaine"
	href: string; // CTA destination
	assignedAt: string; // ISO ; tri secondaire
}

export interface StudentWorkInbox {
	late: WorkItem[];
	thisWeek: WorkItem[];
	later: WorkItem[];
	noDeadline: WorkItem[];
	doneRecently: WorkItem[];
}
```

## Fichiers prévus (Phase 1)

- `src/lib/types/student-inbox.ts` — types `WorkItem`, `StudentWorkInbox`, énums
- `src/lib/server/student-inbox.ts` — `getStudentWorkInbox(supabase, userId)` + helpers privés par source
- `src/lib/server/student-inbox.test.ts` — tests unitaires (mock supabase via helpers existants)

## Contraintes

- **Code anglais**, **UI/UX français**
- **Pas de `any`** : utiliser `Database`/`Tables<>` depuis `$lib/types/database`
- **Pas de migration** v1 : `worksheet_instances.submitted_at` existe déjà
- **Performance** : 4 sous-requêtes en parallèle (`Promise.all`), target < 200ms
- **RLS** : la fonction tourne avec le client `supabase` du contexte (déjà scopé à l'utilisateur), réutiliser cette protection plutôt que requoter en `service_role`
- Réutiliser quand possible : `getStudentAssignments` (`src/lib/server/assessments.ts:352`) déjà N+1-optimized

## Phase 1 livré (2026-05-11)

### Fichiers créés

| Fichier                                | LOC   | Rôle                                                                     |
| -------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `src/lib/types/student-inbox.ts`       | 53    | Types `WorkSource`, `WorkStatus`, `WorkItem`, `StudentWorkInbox`         |
| `src/lib/server/student-inbox.ts`      | 482   | Agrégateur `getStudentWorkInbox` + 4 fetchers privés + bucketize + dedup |
| `src/lib/server/student-inbox.test.ts` | ≈ 700 | Tests unitaires (mock supabase par table)                                |

### Tests

15 cas (`it` actifs) + 1 cas T4 skippé en attente d'extension de `WorkItem`. Couverture :

- E1 (empty), A1 (fan-out direct+classe), A2 (dedup direct+classe sur exercise), A3 (assessment non-publié filtré côté join)
- S1/S2/S3/S4 (un test par règle "fait" : assessment / python / exercise / worksheet)
- T1 (5 sections peuplées simultanément), T2 (done > 7j archivé), T3 (late > 30j archivé)
- T4 skippé : `closes_at` n'est pas exposé dans la `WorkItem` v1
- E3 (done hier mais deadline passée → bucket "Fait recemment", pas "En retard")
- Dedup précédence direct-over-class sur les 3 sources les plus à risque : python, assessment, worksheet (ce dernier couvre le scénario typique : deux rows `worksheet_assignments` distinctes, l'une via classe l'autre via `worksheet_assignment_students`)

### Préférences de réutilisation

- `getStudentAssignments` (`assessments.ts:352`) **n'a pas été appelée**. Sa forme de retour est trop liée à la vue "Mes évaluations" (status `not_started`/`in_progress`/`completed`/`expired`, attempts_count, best_score). Le fetcher dédié `fetchAssessmentItems` produit directement la forme `WorkItem` et reste plus petit que la transformation aurait été. Le pattern N+1-friendly (batch `test_sessions` par `assignment_id`) a été repris à l'identique.

### Hypothèses à valider par l'humain

1. **`worksheet_instances.submitted_at` + `accessed_at`** : ces colonnes existent dans la migration `20250123000000_worksheets.sql` mais sont absentes du `database.ts` régénéré (peut-être supprimées d'une régénération récente ou jamais réincorporées). J'ai utilisé un cast local `WorksheetInstanceRow` pour les sélectionner. Le code existant (`routes/api/worksheets/[id]/instances/+server.ts:288`) les utilise sans cast — donc la colonne DB est probablement bien là, juste pas dans les types. À vérifier avant Phase 2.
2. **`href` pour les worksheets** : j'ai utilisé `/dashboard/student/worksheets/${assignmentId}` (assignment id, pas worksheet id). La spec dit `worksheets.title ?? worksheet_assignments.title` côté titre — j'ai inversé l'ordre conformément au tableau de mapping (`worksheet_assignments.title ?? worksheets.title`). À confirmer.
3. **`T4 closes_at`** : skippé. Pour le supporter il faudrait soit (a) ajouter un champ `closesAt: string | null` à `WorkItem`, soit (b) gérer le flag côté UI avec un fetch séparé du closes_at. Sera tranché en Phase 3 quand on connaîtra le besoin UI.
4. **`assessment.settings.deadline`** : type non-typé (`Json`), j'ai un narrowing `typeof === 'string'`. Si la valeur est stockée comme `Date` sérialisée d'une autre manière, à adapter.

### Ambiguïtés résolues

- **A3** : la spec dit "exclus si `is_active=false` ou `status != 'published'`". Pour les assessments, le filtre est appliqué au join Supabase (`.eq('assessment.status', 'published')`) : les lignes non-publiées arrivent avec `assessment: null` (un join filtré renvoie `null` côté one-to-many → many-to-one). Le code filtre ces lignes via `assignments.filter((a) => a.assessment !== null)`. Pour les autres sources, le filtre `.eq('is_active', true)` ou `.eq('status', 'active')` est appliqué côté DB.
- **Worksheet "active" status** : j'ai filtré `.eq('status', 'active')` (cohérent avec `routes/api/student/worksheets/+server.ts:78`).
- **Dedup tiebreaker** : la spec dit "préférer le direct si conflit" mais n'aborde pas "direct vs direct" ou "classe vs classe" — j'ai choisi `assignedAt` desc comme tiebreaker stable.
- **Bucketing borderline** : `dueAt == nowMs` (au pixel près) → goes to `thisWeek` (la borne `dueMs < nowMs` est stricte). `dueAt == nowMs + 7j` → `thisWeek` (borne `<= nowMs + WEEK_MS` inclusive). Cohérent avec le sens UI "Cette semaine".

### Code review et corrections (post-review)

Code review (`code-reviewer` agent Opus) a remonté 2 vrais bugs corrigés avant commit :

1. **🐛 `dueAt` worksheet** lisait `closes_at` (hard cutoff) au lieu de `due_at` (échéance pédagogique). Corrigé en `due_at ?? closes_at` pour fallback propre. Découvert via le nouveau test dedup worksheet (item se retrouvait en `noDeadline` au lieu de `thisWeek`).
2. **🐛 `available_from` non-filtré** sur les 2 sous-requêtes worksheet : les worksheets programmées dans le futur (`available_from > now`) apparaissaient dans l'inbox. Aligné avec `routes/api/student/worksheets/+server.ts:79` (`.or('available_from.is.null,available_from.lte.${nowIso}')`).

Autres corrections appliquées :

- **Error logging** : helper `logError(label, error)` ajouté + appelé dans les 6 sites de fetch (auparavant les `.error` Supabase étaient silencieusement ignorés). Politique : log mais continue, pour qu'une panne d'une source ne blanche pas l'inbox entier.
- **Python soft-delete** : docstring ajoutée pour expliquer qu'il n'y a pas d'`is_active` ni équivalent — la révocation se fait par DELETE de la ligne. Si la table évolue, mirror `.eq('is_active', true)` à la `exercise_assignments`.
- **Tests dedup ajoutés** : 1 pour assessment (direct+classe sur même `assessment_id`), 1 pour worksheet (deux rows distincts).

Items reportés (non-blockers) :

- Casts `as unknown as X` (sites multiples) : nettoyage de qualité à faire en Phase 2, n'affecte pas la correction
- Discriminated union `WorkItem` (`{status:'done', doneAt: string} | {status:'todo', doneAt: null}`) : refactor potentiel pour Phase 3
- Mock per-table queue : assertion d'ordre des appels (fragile mais OK pour V1)

## Phase 2 livré (2026-05-11)

### Fichiers créés

| Fichier                                                                     | Rôle                                                                                             |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/routes/api/student/worksheets/[assignmentId]/mark-done/+server.ts`     | POST (mark done) + DELETE (unmark) — toggle paper-worksheet self-déclaré                         |
| `src/routes/api/student/worksheets/[assignmentId]/mark-done/server.test.ts` | 11 tests : auth (401/403), accès (404), POST ghost+update+idempotence, DELETE revert+idempotence |

### Fichiers modifiés

| Fichier                                                                              | Rôle                                                                    |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/routes/(protected)/dashboard/student/worksheets/[assignmentId]/+page.server.ts` | Ajout requête `worksheet_instances.submitted_at` pour seed le toggle UI |
| `src/routes/(protected)/dashboard/student/worksheets/[assignmentId]/+page.svelte`    | Ajout bouton "J'ai fait" / "Marquer comme non fait" + handler optimiste |

### Tests

11 tests, tous passent (`pnpm test:server src/routes/api/student/worksheets/[assignmentId]/mark-done/server.test.ts`).
Couverture :

- 401 unauthenticated (POST + DELETE)
- 403 non-student (POST + DELETE)
- 404 quand `can_access_assignment` retourne false (POST)
- POST crée un ghost (`variant_seed=0`, `instance_data={}`, `status='submitted'`) si pas d'instance
- POST update une instance existante en préservant `variant_seed` (pas réécrit)
- POST idempotent : 2e appel → UPDATE, pas INSERT
- DELETE clear `submitted_at` + revert status à `in_progress` (si `accessed_at` set)
- DELETE revert status à `generated` (si `accessed_at` null — cas ghost)
- DELETE idempotent : pas d'instance → 200 avec `instance: null`

### Décision : "ghost instance" on-the-fly

Validée avant Phase 2 par l'utilisateur. Pour les worksheets papier (le professeur génère le PDF côté enseignant et l'élève travaille au crayon, pas de flux online), il n'existe pas de `worksheet_instances` row pour ce couple `(worksheet, student)`. Le schema requiert `variant_seed INTEGER NOT NULL CHECK >= 0` et `instance_data JSONB NOT NULL DEFAULT '{}'`. Plutôt qu'ajouter une migration pour rendre ces champs nullable, on synthétise une ligne "ghost" minimale :

- `variant_seed = 0`
- `instance_data = {}`
- `status = 'submitted'`
- `submitted_at = NOW()`

Cette forme cohabite proprement avec les vraies instances générées par le flux teacher (`/api/worksheets/[id]/instances`). Le DELETE revert le statut à `generated` (si ghost, `accessed_at = null`) ou `in_progress` (si l'élève avait aussi ouvert la version en ligne au moins une fois).

### Décision : `submitted_at` côté page server, pas via l'API

L'API existante `GET /api/student/worksheets/[assignmentId]` ne retourne pas `submitted_at` (focalisée sur le rendu d'exercices). Plutôt qu'élargir son schéma de réponse Zod et toucher à `StudentWorksheetView`, j'ai ajouté une 2e requête isolée dans `+page.server.ts` qui lit juste `submitted_at`. Une seule requête supplémentaire `.maybeSingle()` sur `worksheet_instances` — coût négligeable, isolation maximale.

### Workaround `database.ts`

Même problème que Phase 1 : `worksheet_instances.submitted_at` et `accessed_at` existent en base (migration `20250123000000_worksheets.sql:246`) mais sont absents du `database.ts` régénéré. Workaround appliqué :

- `+server.ts` : interface locale `InstanceLookupRow { id, variant_seed, accessed_at, submitted_at, status }` + cast `as unknown as InstanceLookupRow | null` sur la lecture
- `+page.server.ts` : interface locale `InstanceSubmittedRow { submitted_at: string | null }` + même cast

Si à terme `database.ts` est régénéré avec ces colonnes, ou si on étend `database-helpers.ts` avec un `WorksheetInstance` type, ces casts peuvent disparaître. Pas bloquant en V1.

### Hypothèses à valider par l'humain

1. **Statut revert** : DELETE revert à `in_progress` si `accessed_at` set, sinon `generated`. C'est ma lecture du contrat schema (`status_check` CHECK IN ('generated', 'in_progress', 'submitted', 'graded')). Si la UX réelle attend autre chose (par exemple toujours revert à `generated`), simple à changer.
2. **Pas d'invalidation `data.submittedAt` après toggle** : on update juste l'état local `isDone`. Si l'élève recharge la page après toggle, le nouveau `submittedAt` est fetché côté serveur (cohérent). Le `// svelte-ignore state_referenced_locally` mirror le pattern de l'exercise page (`+page.svelte:14`).
3. **Toast text** : J'ai choisi "Marqué comme fait !" et "Marque retirée" pour être courts et clairs ; texte à ajuster si l'équipe préfère autre chose.

### Ambiguïtés résolues

- **Empty-body schema** : utilisé `z.object({}).strict()` pour POST. Validation lenient sur le `request.json()` (catch → `{}`) puis strict sur le schema → toute clé en plus = 400. Defense-in-depth.
- **`error.code === '23505'` race recovery** : si 2 POST arrivent en parallèle et que le 1er INSERT gagne, le 2e attrape la PG unique violation et re-lit l'instance créée, traitant le call comme un no-op. Évite un faux 500 visible côté élève.
- **404 vs 403 sur RLS denied** : retourné 404 ("Devoir non trouve") pour ne pas leak l'existence de l'assignation à un élève non ciblé. Pattern emprunté à `routes/api/student/worksheets/[assignmentId]/+server.ts:219`.

### Items pour Phase 3+ (non-blockers)

- Si la widget home / page travail veut afficher un compteur "X faits cette semaine", il faudra exposer `worksheet_instances.submitted_at` quelque part — l'aggregator du Phase 1 le lit déjà via `WorksheetInstanceRow`, donc OK.
- Pas d'optimistic à invalider après reload : un revisit après toggle re-lit `submittedAt` côté serveur via `+page.server.ts`. Si à terme on veut mettre à jour live l'inbox d'un autre onglet, il faudra Realtime ou refetch ; hors scope Phase 2.
