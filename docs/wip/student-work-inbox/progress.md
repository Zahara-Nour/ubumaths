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

## Phase 3 livré (2026-05-11)

### Fichiers créés

| Fichier                                                         | LOC | Rôle                                                                            |
| --------------------------------------------------------------- | --: | ------------------------------------------------------------------------------- |
| `src/routes/(protected)/dashboard/student/work/+page.server.ts` |  22 | Loader : `requireRole('student')` + `getStudentWorkInbox` (zero transformation) |
| `src/routes/(protected)/dashboard/student/work/+page.svelte`    | 135 | Page rendant les 5 sections + empty-state                                       |
| `src/lib/components/student-inbox/WorkInboxSection.svelte`      |  96 | Section titrée, mode always-open OU collapsible                                 |
| `src/lib/components/student-inbox/WorkItemCard.svelte`          | 169 | Carte unitaire d'item (badge + titre + classe + date + CTA)                     |
| `src/lib/components/student-inbox/WorkItemCard.svelte.test.ts`  | 165 | 15 tests vitest browser sur le rendu de la carte                                |

### Tests

15 tests, tous passent (`pnpm test:client src/lib/components/student-inbox/WorkItemCard.svelte.test.ts`).

Couverture :

- Title : rendu du `item.title`
- Badge par source : 4 cas paramétrés (assessment="Test", exercise="Exercice", worksheet="Fiche", python="Python")
- CTA par source : 4 cas paramétrés + 1 cas spécial (assessment viewed → "Reprendre")
- Viewed indicator : 3 cas (viewed+todo → visible ; viewed=false → absent ; status=done → absent même si viewed=true)
- Done date label : 2 cas (status=done → préfixe "Fait " ; null+null → pas de ligne)

### Décisions visuelles

- **Badges** :
  - `assessment` → variant `destructive` (rouge) + icône `ClipboardList`
  - `exercise` → variant `default` (primary) + icône `BookOpen`
  - `worksheet` → variant `secondary` + icône `FileText`
  - `python` → variant `outline` + icône `Code`
- **Section "En retard"** : `border-l-4 border-destructive` avec icône `AlertTriangle`, header texte rouge. Toujours expanded.
- **Section "Fait cette semaine"** : items rendus avec `opacity-60`. Collapsible, collapsed par défaut.
- **Layout carte** : stack vertical sur mobile (`flex-col`), horizontal sur `sm:` et plus (`sm:flex-row`). CTA toujours à droite/dernière position.
- **Card cliquable entière** : le card est un `<a>` qui couvre tout le clic-target. Le bouton CTA à l'intérieur est un `<span>` _décoratif_ stylé via `buttonVariants` (nested `<a>` invalide HTML, single interactive ancestor pour les lecteurs d'écran).
- **Viewed indicator** : `•` U+2022 en `text-primary/50`, attribut `title=` pour le tooltip natif (pas de Shadcn Tooltip — overkill ici).
- **Empty state E1** : Card en bordure dashed, icône `Inbox` centrée, 2 boutons CTA "Pratique d'exercices" → `/dashboard/student/exercises` et "Exercices Python" → `/python-exercises`.
- **Largeur max page** : `max-w-4xl` (plus étroit que le `max-w-7xl` des worksheets — choix éditorial : c'est une liste verticale de cartes, pas une grille, donc une colonne lisible suffit).

### Ambiguïtés résolues

1. **"Reprendre" pour assessment viewed** : la spec dit `Commencer/Reprendre` pour assessment. Le champ `item.viewed` est aujourd'hui toujours `false` côté agrégateur pour les assessments (Phase 1 ne lit pas `test_sessions.created_at` comme signal `viewed`). J'ai câblé la logique côté carte de sorte que dès que l'agrégateur populate `viewed=true` pour assessment, le CTA bascule automatiquement. Le test en `viewed:true` force la valeur pour démontrer le comportement.
2. **Conflit "carte = lien + bouton = lien"** : la spec dit "wrap in `<a>`" ET "ensure the inner CTA Button also has the link" puis "don't nest interactive elements". J'ai tranché : seul l'ancre extérieure est interactive, le CTA intérieur est un `<span>` décoratif. Rationnel : nested `<a>` violent HTML, et un `<button>` enfant interceperait les clics (déclenchant l'ancre par bubbling mais en dégradant l'expérience clavier). Le span garde le rendu visuel attendu via `buttonVariants` + `cn`.
3. **Empty-state copy** : la spec dit "Rien d'assigné pour le moment". Ajout d'un sous-texte "Profitez-en pour vous entraîner !" pour adoucir la formulation (sinon ça sonne sec). Modifiable.
4. **Title page** : "Mon travail" (singulier, comme la spec). H1 + `<title>` cohérents.

### Surprises / éléments demandant un œil humain

1. **`resolve()` requis sur tous les `<a href>`** : le svelte-autofixer impose `resolve(item.href as '/')` pour les hrefs dynamiques (typed routes SvelteKit). Le pattern est utilisé dans `Header.svelte:379`. La cast `as '/'` est cosmétique (un type widening) — à terme, un type `Route` pourrait être inféré depuis `item.href`. Pour `WorkItemCard`, j'ai importé `resolve` depuis `$app/paths`.
2. **`page.getByLabel` n'existe pas** dans le `@vitest/browser/context` API : j'ai dû utiliser `getByTitle` pour le viewed dot (le span a `aria-label` ET `title`). L'attribut `title=` est nécessaire pour ce test ; il sert aussi de tooltip natif visible au survol.
3. **Tailwind class merging** : j'ai ajouté `cn(buttonVariants(...), 'w-full sm:w-auto')` pour appliquer l'override responsive sur le CTA décoratif. Pattern standard ailleurs dans le codebase.

### T4 ("Fermé" badge) — toujours différé

Comme en Phase 1 et 2, le T4 est différé. Raisons :

- Aucun champ `closesAt` n'existe encore sur `WorkItem` ; les assessments n'ont pas de colonne `closes_at` exposée (juste `settings.deadline` qui sert déjà à `dueAt`).
- La section "En retard" (rouge, en haut, toujours visible) couvre déjà le besoin visuel principal "ce travail est passé l'échéance".
- Le badge "Fermé" supposerait une distinction _hard cutoff_ vs _soft deadline_ qui n'existe pas dans le modèle actuel pour 3 des 4 sources.

Pour revisiter T4 plus tard : étendre `WorkItem` avec un champ `closesAt: string | null`, exposer la colonne worksheet `closes_at` (déjà lue côté agrégateur pour le fallback `dueAt`), et reproduire la sémantique pour les autres sources (probablement via `*_assignments.optional_deadline`/`due_date` côté hard).

### Pas (encore) fait — Phase 4

- Pas d'entrée Sidebar pour `/dashboard/student/work` (la page est joignable directement à l'URL pour validation visuelle).
- Pas de widget home (3-5 items "À faire prioritaire").
- Pas de tests pour `WorkInboxSection.svelte` (composition pure de cartes ; pas de logique à isoler).
- Pas de tests pour `+page.server.ts` (le loader est 3 lignes ; les `requireRole` et `getStudentWorkInbox` sont déjà testés ailleurs).

### Quality checks restants (à passer par humain en Phase 5)

- `npx eslint <les 4 fichiers nouveaux>` (pas exécuté côté agent — règle CLAUDE.md)
- `pnpm check:incremental` (idem)
- Vérification visuelle réelle de la page (mobile + desktop, dark mode, empty state, sections collapsibles)
- Test E2E manuel avec un compte élève réel ayant des items de chaque source

## Phase 4 livré (2026-05-11)

### Fichiers créés

| Fichier                                                       | LOC | Rôle                                                               |
| ------------------------------------------------------------- | --: | ------------------------------------------------------------------ |
| `src/lib/components/student-inbox/InboxWidget.svelte`         |  76 | Widget home — 5 items urgents max, 3 états (urgent / calme / vide) |
| `src/lib/components/student-inbox/InboxWidget.svelte.test.ts` |  95 | 9 tests vitest browser couvrant les 3 états + slicing + compteur   |

### Fichiers modifiés

| Fichier                                                    | Modification                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/routes/(protected)/dashboard/+page.server.ts`         | Ajout import + fetch `getStudentWorkInbox` en parallèle des queries student    |
| `src/routes/(protected)/dashboard/StudentDashboard.svelte` | Import `InboxWidget`, rendu conditionnel au-dessus de `RewardsBlock`           |
| `src/lib/components/Sidebar.svelte`                        | "Mes Fiches" → "Mon travail", icône `ListTodo`, href `/dashboard/student/work` |
| `src/lib/components/Header.svelte`                         | Même remplacement pour le drawer mobile                                        |

### Tests

9 tests, tous passent (`pnpm test:client src/lib/components/student-inbox/InboxWidget.svelte.test.ts`).

Couverture :

- Header "Mon travail" rendu dans tous les cas
- Lien "Voir tout (N)" présent quand totalCount > 0, absent quand 0
- Tri late > thisWeek ; slicing à `maxItems=3` (4e item absent du DOM)
- Message "Rien d'urgent" quand urgentItems = 0 et totalCount > 0
- Comptage pluriel correct "2 éléments en cours"
- Empty state "Rien d'assigné" quand totalCount = 0
- Absence de cartes WorkItemCard en empty state

### Décisions

- **Icône nav** : `ListTodo` (lucide-svelte) — cohérente avec le type de contenu, pas encore utilisée ailleurs dans la nav.
- **"Mes Fiches" remplacé** (pas ajouté en doublon) : décision validée par l'utilisateur avant la phase. L'URL `/dashboard/student/worksheets` reste accessible directement et via l'inbox.
- **Widget placement** : au-dessus de `RewardsBlock` dans `StudentDashboard.svelte`. Les blocs commentés (SRS, exercices récents, achievements) sont laissés en l'état.
- **Rendu conditionnel `{#if data.inbox}`** : le champ est `null` pour les rôles non-student (retour de `+page.server.ts`). Le composant n'est rendu que pour les étudiants.
- **Fetch parallèle** : `getStudentWorkInbox` ajouté comme 4e élément de `Promise.all` dans le bloc `if (profile.role === 'student')`. Aucune régression sur les autres queries.

### Bug découvert et corrigé

Le template initial avait une interpolation multiligne `{totalCount}\n\t\t\t\t{... ? ... : ...}` qui produisait un nœud texte avec un retour à la ligne entre le nombre et "éléments". Le test `/2 éléments en cours/` échouait car le DOM contenait `2\n\t\t\t\téléments`. Corrigé en collant les deux expressions sur une seule ligne : `{totalCount} {totalCount > 1 ? 'éléments' : 'élément'} en cours.`

### Quality checks restants (à passer par humain en Phase 5)

- `npx eslint <fichiers modifiés phase 4>` (pas exécuté côté agent)
- `pnpm check:incremental` (idem)
- Vérification visuelle du widget sur le dashboard (mobile + desktop, dark mode, 3 états)
- Test E2E avec un compte élève réel
