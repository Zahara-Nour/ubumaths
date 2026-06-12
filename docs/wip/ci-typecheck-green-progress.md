# CI Type Check — green-up chantier (progress)

> But : verdir le job **Type Check** de `quality.yml`. Démarré 2026-06-13.

## Découverte critique (le point de départ était faux)

- Le job CI `pnpm check` (= `svelte-check`) était annoncé « rouge sur ~9 erreurs ».
- **Réalité** : `check:incremental` ne montrait 9 erreurs que parce que son cache disque
  ne re-vérifie que les fichiers récemment touchés. Un `svelte-check` complet (ce que fait
  la CI) reporte **2233 erreurs / 316 fichiers**.
- Pire : en CI le job ne reportait même pas les erreurs — il **crashait OOM (exit 134)**.
  Cause : bug shell dans le script `check` — `NODE_OPTIONS='…8192' svelte-kit sync && svelte-check …`
  n'appliquait le heap 8 Go qu'à `svelte-kit sync`, **pas** à `svelte-check` (l'étape lourde).

Split des 2233 erreurs :

- **1586** dans des fichiers de test (`*.test.ts`, `__tests__/**`, `tests/**`) — dérive de type,
  pas des bugs produit (les tests sont validés à l'exécution par vitest, pas type-checkés).
- **647** dans du source produit — les vrais bugs.

## Décision (validée PO) : Option A — scoper le gate au source

Exclure les fichiers de test du gate CI (ils restent exécutés par vitest), fixer la OOM,
puis brûler les erreurs **source** par lots. Ne masque AUCUN bug produit.

## Phase 1 — config + nettoyage (FAIT)

- **Nouveau `tsconfig.check.json`** : étend `./tsconfig.json`, `exclude` = excludes parent
  (service-worker, node_modules) + globs de test + `extern/**`.
- **`package.json` `check`** : pointe sur `tsconfig.check.json` ET déplace le flag heap 8 Go
  sur `svelte-check` (corrige la OOM).
- **Supprimé** `src/routes/slides/demo/**` + `slides/demo-embedded/**` : prototypes morts
  important des modules disparus (`$lib/slides`, `$lib/questions/types`, …) et ne parsant
  même pas (`<script lang>` lu comme TS). Aucune référence ailleurs. (`test-transitions/`
  et `+layout@.svelte` conservés, sains.)
- **`extern/`** exclu du gate (local-only, gitignoré, mais contient des sources de repo
  nécessaires — on le garde sur disque, juste hors type-check).

### Résultat Phase 1

- `svelte-check --tsconfig ./tsconfig.check.json` **complète sans OOM** (plus d'exit 134).
- Baseline source honnête : **622 erreurs / 208 fichiers** (était 2233).
- Le job reste rouge tant que les 622 ne sont pas corrigées → Phase 2.

## Phase 2 — burn-down des 622 erreurs source (EN COURS)

Ordre prévu (plus petit / haute confiance d'abord), **commit + code-review par zone** :

| Zone                                              | Erreurs (approx)          | État    |
| ------------------------------------------------- | ------------------------- | ------- |
| `src/lib/config`                                  | 15                        | à faire |
| `src/lib/server`                                  | 29                        | à faire |
| `src/lib/geometry-core`                           | 85                        | à faire |
| `src/lib/mathAST`                                 | 149                       | à faire |
| `src/lib/whiteboard`                              | 38                        | à faire |
| `src/lib/components`                              | 104                       | à faire |
| `src/routes/**`                                   | 180 (slides/demo retirés) | à faire |
| divers (constructions-v2, ubumark, stores, math…) | ~42                       | à faire |

Règle : ne pas « caster pour faire taire » — corriger le vrai type / la vraie signature.
Pas de `any`, éviter `@ts-ignore`.

### Batch fait : lucide icons (commit `ecd71a276`) — 622 → 596 (-26)

- Cause racine : lucide-svelte v0.545 expose des **composants classe legacy**
  (`class extends SvelteComponentTyped<IconProps>`), pas des `Component` fonction Svelte 5.
  → champs `icon: Component` rejetaient tous les icones. Fix = `ComponentType` (svelte).
- Fichiers : `dashboard-nav.ts`, `Header.svelte`, `MobileNavDrawer.svelte` (+ 4 layouts/pages
  consommateurs corrigés automatiquement).

### ⚠️ Obstacles découverts (à connaître)

1. **Vérification lente / OOM-prone** : `svelte-check` est whole-program (~5 min, sensible OOM).
   Donc verif **par batch**, pas par fichier. Pas de boucle.
2. **Pre-commit OOM** : `vitest related` (gate léger) sature le heap sur fichiers très importés
   (ex. `Header.svelte`). Workaround : `NODE_OPTIONS='--max-old-space-size=8192' git commit`.
3. **Vrais bugs mêlés aux dérives de type** (pas que du mécanique). Exemples côté `src/lib/server`
   qui ressemblent à des **bugs runtime**, à confirmer avec David avant de « corriger » :
   - `notifications.ts:65,83` : requête sur colonne `teacher_id` absente du type de la table
     (colonnes `id|student_id|class_id|status|joined_at`) → mauvaise colonne/table ?
   - `summaries/daily.ts:336`, `weekly.ts:94` : colonne `is_test` absente de la même table.
   - `buddy-queries.ts:86,111` : RPC `p_student_id` typé `undefined` → migration RPC non
     reflétée dans les types DB générés (manque `pnpm db:types` ?).
   - `exercise-backup.ts:184` : propriété `tags` absente du type retourné.
     Ces cas ne doivent PAS être « castés pour faire taire » — ce sont des signaux.

### Batch fait : src/lib/server (25/29 corrigées, par l'orchestrateur)

Corrigées :

- **TablesUpdate cluster** (6) : `const updateData: Record<string,unknown>` → `TablesUpdate<'table'>`
  (chapters ×3, journal, assessments, chapter-templates).
- **warnings.ts** (3) : casts résultat RPC Json → `as unknown as Shape` (frontière RPC).
- **notifications.ts** (2) — **VRAI BUG corrigé** : vérif d'autorisation requêtait
  `class_members.teacher_id` (colonne inexistante) → toujours null → **les profs ne pouvaient
  PAS cibler de notifications par classe/élève**. Corrigé : `classes.teacher_id` + join
  `class_members → classes!inner(teacher_id)`.
- **summaries/daily.ts + weekly.ts** (2) — **VRAI BUG corrigé** : filtre `.eq('is_test', false)`
  sur `class_members` (colonne sur `profiles`) → les requêtes **throwaient** → résumés
  quotidiens/hebdo cassés. Corrigé via join `profiles!class_members_student_id_fkey` (pattern
  de `students.ts`).
- **buddy-queries.ts** (3) : (a) bug no-op `change_count: supabase.rpc ? undefined : undefined`
  supprimé ; (b) args RPC `increment_buddy_change_count`/`add_buddy_xp` → `as never` (RPC en DB
  mais **types générés périmés → `pnpm db:types` à faire**).
- **srs/fsrs-actions.ts** (4) : narrow DB string→union (`card_reference_type`, `state`),
  Json↔`ReviewHistoryEntry[]` aux frontières.
- **achievements/service.ts** (1) + **kanban.ts** (2) : `?? null`→`?? undefined` (params RPC
  optionnels) ; fallback `KanbanBoardMember` complété (firstname/lastname/role manquants).
- **validation/index.ts** (2) : collision `export *` résolue par re-export explicite.

⚠️ **FLAGGÉ pour David — cluster `tags` (4 erreurs NON corrigées, ambiguïté d'architecture)** :
`exercise-backup.ts:184,592`, `exercises.ts:302`, `exercise-import-export.ts:317`. La colonne
`exercises.tags` existe encore mais `exercises.ts` route délibérément les tags via la table de
jonction `exercise_tags` ("Tags are stored in the junction table, not on the row"). Décider :
backup/restore doit-il lire/écrire la colonne legacy `tags` ou la jonction ? Ne pas caster à
l'aveugle. + duplication `questionCategorySchema` (assessments vs questions, shapes différentes)
et `variableSchema` (exercises vs template-schema) à consolider.

### Batches agents (parallèle) — rapports

- **whiteboard (38/38)** ✅ par agent. Clusters : lucide `typeof Icon`, readonly arrays, props
  optionnels narrowing, MySelect value:string, etc.
  ⚠️ BUG FLAGGÉ : `arrowType` n'est PAS propagé aux éléments sélectionnés (`updateSelectedStyles`
  dans `whiteboard.svelte.ts` ne gère que `elbowed`) → changer le type de flèche sur une sélection
  ne l'applique pas aux éléments. À corriger côté `whiteboard.svelte.ts` (hors zone typecheck).
- **misc (27/27)** ✅ par agent (ubumark, math/intervals, grapheur, questions/generator, stores,
  workers, migration, notebook-export…). Clusters : duplicate export `NumberLineNode`, narrowing
  `EvalResult`/`EvalValue`, readonly index sig, Json→type aux frontières DB.
  ⚠️ BUG FLAGGÉ : `output-compare.ts` kind `'custom'` n'a pas d'implémentation côté main thread
  (censé tourner dans Pyodide) → appeler `compareOutputs({kind:'custom'})` depuis le main échoue.
- **geometry-core / constructions-v2 / constructions (100/100)** ✅ par agent. 0 cast de
  silence (6 `as unknown as` préexistants RETIRÉS). Clusters : `GeoVectorOrientedAlongLine`
  manquant du union `GeoElement` (débloque 19), helpers sur-typés `ScalarParam`, 3ᵉ param
  `displayStyle` requis sur `multiply/divide` mathAST, résolution `ScalarParam` via
  `figure.resolveParam`/nouveau `resolveParamToGeoValue`, `InfinityParam` géré, prédicats de
  type corrigés. ⚠️ CHANGEMENTS DE COMPORTEMENT (latents, améliorations — à valider PO) :
  (1) transforms pilotés par slider sur vecteurs/arcs/cercles renvoyaient `NaN` → maintenant
  résolus correctement ; (2) sérialisation de bornes infinies (intégrales impropres V5)
  produisait `"NaN"` → maintenant tokens `+infini`/`-infini`. Nouveau helper public
  `Figure.resolveParamToGeoValue`.
- **mathAST / components / routes** : en cours (rapports à venir).

### Round résiduels (596 → 50 → 24 → ~13)

Après la passe agents (596→50), 2 rounds de nettoyage des résiduels (agent mathast-expert
sur solve/algebra/pipeline + corrections manuelles : DslPlayer props, DebugInstance precision,
kanban `?? []`, Slider `type="multiple"`, GeometryCanvas resolveParam/geoToNumber,
LockedPythonEditor type-only import, ConsentButton/JsonEditor/ListingDetailsModal casts frontière,
QuestionBase `as unknown as Record`, etc.).

### ⚠️ DÉCISIONS HUMAINES REQUISES (erreurs laissées exprès — NE PAS caster à l'aveugle)

1. **`AddFriend.svelte:100` — relation `'mentor'` invalide** : l'UI propose `'classmate' | 'mentor'`
   mais l'enum DB `relation_type` ne connaît que `'friend' | 'classmate' | 'study_buddy'`. Choisir
   « Mentor » échoue au niveau DB. Décider : ajouter `'mentor'` à l'enum DB (migration) OU retirer
   l'option de l'UI.
2. **Cluster `tags` (4) — `exercise-backup.ts:184,592`, `exercise-import-export.ts:317`,
   `exercises.ts:302`** : colonne legacy `exercises.tags` vs table de jonction `exercise_tags`.
   Décider de la source de vérité pour backup/restore.
3. **`mathAST/parser/custom/pattern-parser.ts:299,301` (4)** : `parseWildcard` retourne
   `SequencePattern`/`OptionalSequencePattern` depuis une méthode typée `Pattern` (le runtime marche,
   le modèle de types non). Fix propre = élargir les signatures des builders binaires aux
   `SumPatternElement` (décision de design du module pattern).
4. **`mathAST/pedagogical-solve/rational-inequality.ts:227` (2)** : branche `throw` morte
   (`status === 'error'|'unsupported'` jamais atteint). La « corriger » (via `result.error`)
   réactiverait un throw qui ne s'exécute jamais aujourd'hui = changement de comportement.
5. **`components/ui/calendar/calendar.svelte` (2)** : composant shadcn-généré, friction
   discriminated-union bits-ui v2. Fix propre = régénérer via la CLI shadcn-svelte (le consommateur
   `CardEditForm.svelte` passe bien `type="single"`).

## Hors de ce chantier (autres jobs rouges, séparés)

- **Tests** (2 shards) : ENOENT sur fixtures `extern/instrumenpoche-main/...` absentes en CI →
  `describe.skipIf(!existsSync(...))`. En attente (« Wait » PO).
- **Lint** (prettier --check + eslint) : `prettier --write .` + `eslint --fix`. En attente.

## Ne PAS pousser — David gère le déploiement.
