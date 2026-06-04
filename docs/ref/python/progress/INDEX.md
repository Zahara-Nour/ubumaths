# Python — Index chronologique des progressions

Récapitulatif chronologique des jalons de l'écosystème Python d'UbuMaths (~100+ commits, 2025-12-04 → 2026-05-09).

> Pour la vue thématique par sous-système, voir [../README.md](../README.md).

---

## 2025-12-04 — Playground MVP (Phase 1-7)

Mise en place initiale du playground : Pyodide + Web Worker + CodeMirror + erreurs pédagogiques.

| Commit      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `d59b2d4a0` | Phase 1 — UI foundation                               |
| `8b02eedcb` | Pyodide Web Worker for code execution                 |
| `cf2ffe032` | CodeMirror 6 editor with lazy loading                 |
| `738ec122e` | Output component with pedagogic errors and loading UX |
| `10707ca6c` | 77 tests (45 store + 36 output)                       |
| `b24e3b4fb` | Fix : dynamic import for Pyodide in ES module worker  |
| `804b9acd0` | Fix : suppress matplotlib AGG backend warning         |

→ [python-playground-progress.md](./python-playground-progress.md) (Phases 1-7)
→ [python-playground-phase1-progress.md](./python-playground-phase1-progress.md)
→ [python-playground-phase2-progress.md](./python-playground-phase2-progress.md)
→ [python-playground-phase2-summary.md](./python-playground-phase2-summary.md) (récap implementation)

---

## 2025-12-05 — Playground 8 améliorations + Cloud + Settings

10 features ajoutées : toolbar, partage URL, fullscreen, splitter, LaTeX SymPy, autocomplétion, erreurs ligne, font size. Cloud storage, thèmes éditeur, Service Worker.

| Commit      | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| `c2d7a09a7` | Phase 1 — modification tracking + plot download                                |
| `ba51656bf` | 8 améliorations (Ctrl+S, share URL, fullscreen, splitter, LaTeX, autocomplete) |
| `a5514ddc0` | Fix : SyntaxError display                                                      |
| `d88bb5be3` | Fix : Python syntax errors and tracebacks display                              |
| `5aae73b1d` | Fix : extract correct line number from user code in traceback                  |
| `7ff47aef7` | Visual error line highlighting in CodeMirror                                   |
| `43089d5ce` | Fix : last line number from traceback for error location                       |
| `8480d0bb4` | Fix : errorLineEffectType reactive with $state                                 |
| `99bcbd6bb` | Fix : set errorLineEffectType after editor creation                            |
| `a451fd6e9` | Fix : `$state.raw` for editor reactivity tracking                              |
| `76b8530e5` | Fix : shorten traceback display to essential message only                      |
| `5a744b8d7` | Adjustable font size control in editor                                         |
| `223a80b9a` | Lazy loading packages + Plotly support + CSP headers                           |
| `0e231892c` | Service Worker for CDN caching                                                 |
| `1fb69e596` | Cloud storage with file management and class assignments                       |
| `8229e9770` | Fix : CSP for Google profile images and file loading                           |
| `7506b9324` | Editor theme settings with 12 CodeMirror themes                                |
| `0cd7b263f` | Persist playground settings to database for logged-in users                    |
| `523488815` | Docs : python_settings column in database schema                               |
| `ea0e316de` | Fix : allow theme extensions to apply their own backgrounds                    |
| `e383b53a1` | Fix : separate theme backgrounds from base theme                               |

→ [python-playground-improvements.md](./python-playground-improvements.md) (8 phases)
→ [python-phase3-url-sharing.md](./python-phase3-url-sharing.md)
→ [python-autocomplete-progress.md](./python-autocomplete-progress.md)
→ [python-lazy-loading-plan.md](./python-lazy-loading-plan.md)
→ [python-files-progress.md](./python-files-progress.md)
→ [python-playground-phase4-progress.md](./python-playground-phase4-progress.md)

---

## 2025-12-06 — Notebook Sprint 2-3 + Exercises + Refactor

Refactor majeur : pattern executor + multi-context worker. Notebook MVP, exercises API, ipynb import/export, sharing, readonly, autosave.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `174fb7cbe` | Shared types for notebook and validation             |
| `4ea054ff3` | Multi-context support to worker                      |
| `2bcce5b9e` | **Refactor : extract base executor pattern**         |
| `3226db755` | **Refactor : decouple editor from store singleton**  |
| `57e545924` | Fix : add delete and destroy methods to PyProxy type |
| `420ad770a` | Exercise validation system (3 stratégies)            |
| `4dac46946` | **Python Notebook MVP (Sprint 3)**                   |
| `f3ea33a10` | ipynb import/export                                  |
| `3d7f6911e` | Readonly mode for student viewing                    |
| `e9fc38468` | Notebook sharing (with classes)                      |
| `8e23c7f7e` | Autosave with debouncing and visual indicators       |
| `3dab21eb2` | Keyboard shortcuts help and reset kernel             |

→ [python-shared-types.md](./python-shared-types.md)
→ [python-worker-multicontext.md](./python-worker-multicontext.md)
→ [python-executor-pattern.md](./python-executor-pattern.md)
→ [python-validation-implementation.md](./python-validation-implementation.md)
→ [python-exercises-api-progress.md](./python-exercises-api-progress.md)
→ [python-notebook-complete.md](./python-notebook-complete.md) (vue d'ensemble Sprint 2-4)
→ [notebook-implementation.md](./notebook-implementation.md) (types, store, executor)
→ [notebook-ui-complete.md](./notebook-ui-complete.md) (8 composants)
→ [notebook-ui-progress.md](./notebook-ui-progress.md)
→ [python-notebooks-migration.md](./python-notebooks-migration.md) (DB)
→ [python-notebooks-routes-progress.md](./python-notebooks-routes-progress.md) (API)
→ [notebook-import-implementation.md](./notebook-import-implementation.md)
→ [notebook-export-implementation.md](./notebook-export-implementation.md)
→ [notebook-sharing-implementation.md](./notebook-sharing-implementation.md)
→ [notebook-readonly-mode-progress.md](./notebook-readonly-mode-progress.md)
→ [notebook-test-enhancement-summary.md](./notebook-test-enhancement-summary.md)

---

## 2025-12-09 — Sécurité

| Commit      | Description                         |
| ----------- | ----------------------------------- |
| `2302ff89e` | UUID validation to route parameters |

---

## 2025-12-20 → 2025-12-23 — Debugger (Phase 1-3)

Mise en place du débogueur step-by-step : tracer générateur, store, executor extensions.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `cf488043c` | Fix : CommonMark syntax in block-first list examples |
| `cd504cd4f` | Debug store and executor extensions (Phase 3)        |

→ [python-debugger-progress.md](./python-debugger-progress.md) (Phases 1-6 globales)

---

## 2026-01-03 — Fix divers

| Commit      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `186352255` | Fix : status='active' filter on class members queries |

---

## 2026-05-02 — Debugger Phase 6 : Heap Visualization

Visualisation mémoire complète style Python Tutor : Frames + Heap + flèches SVG cubic-Bezier.

| Commit      | Description                                              |
| ----------- | -------------------------------------------------------- |
| `77a99b81d` | Docs : import Python playground & notebook documentation |
| `41dc33455` | Fix : 'default' theme follow app dark mode               |
| `80f5d987e` | Phase 1 — tracer + types + schemas                       |
| `665615ddb` | Phase 2 — FramesPanel + HeapPanel                        |
| `2e3697a38` | Phase 3 — MemoryDiagramView + arrows                     |
| `98b937a30` | Phase 4 — DebugPanel integration                         |
| `6b4ab0757` | Phase 5 — quality checks + docs                          |

→ [python-debugger-progress.md](./python-debugger-progress.md) (Phase 6)

---

## 2026-05-03 — Sidebar + branding

| Commit      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `a3dd2c8a0` | "Le Serpentarium" hero banner on `/python` page        |
| `ae4102f78` | Sidebar : Python playground link for students/teachers |
| `4977c8ef9` | Sidebar : Python link visible to all users             |

---

## 2026-05-07 — Debugger UX polish

| Commit      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `6f0e25b1d` | Fix : drop duplicate "Exécuter" button in DebugToolbar |
| `aafec3cf3` | Refactor : unify Run/Debug controls in PythonToolbar   |

---

## 2026-05-08 — Examples Library (100 exemples)

Bibliothèque d'exemples curés intégrée au playground.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `259bfa1c2` | Schema + filter utilities                            |
| `6a6a95a54` | 30 curated examples across 9 categories              |
| `7c6f2e0f2` | Library tab in PythonFileManager                     |
| `990a0c06a` | Load with confirmation when editor is modified       |
| `b0d1874e1` | Replace plotly with scatter+regression example       |
| `26b388183` | Fix : drop misleading hardcoded module list in error |
| `641f961b3` | **Expand catalog to 100 examples + hasard category** |
| `8c5b57310` | Docs : finalize python-examples-library progress doc |

→ [python-examples-library-progress.md](./python-examples-library-progress.md)

---

## 2026-05-08 — Exercises UI MVP (création + consultation + tags)

Mise en place des routes utilisateur pour les exos Python : création teacher, consultation publique, séparation des tags Python des math tags, refonte du modèle de niveau.

| Commit      | Description                                                           |
| ----------- | --------------------------------------------------------------------- |
| `cb04a3cd0` | feat : expose `validateExercise` via BasePythonExecutor               |
| `c192cdd59` | test : 12 tests d'intégration Pyodide réel (3 stratégies + isolation) |
| `4d39ceaf5` | **fix : isolation namespace Pyodide entre playground et validations** |
| `c587ad36a` | fix : unique constraints sur assignments                              |
| `526632239` | feat : RLS — accès anon aux exos publics                              |
| `74c93e015` | feat : composants partagés (ValidationResult + StrategyEditor)        |
| `80c7adae9` | feat : page consultation `/python-exercises/[id]`                     |
| `f0a315507` | fix : rendu markdown sur la page consultation                         |
| `225697441` | feat : formulaire création + page liste + landing                     |
| `10a945785` | fix : suppression du champ `difficulty` + crash checkbox bind         |
| `993613847` | feat : champ `level` (college/lycee/nsi/etudiant)                     |
| `832075eee` | feat : table dédiée `python_tags` (séparée des math tags)             |
| `ca737a540` | chore : 5 exercices seedés (1 par stratégie)                          |

→ [python-exercises-executor-progress.md](../../wip/python-exercises-executor-progress.md)
→ [python-exercises-namespace-isolation-progress.md](../../wip/python-exercises-namespace-isolation-progress.md)

---

## 2026-05-08 — Exercises Output V2 (presets + tolérance numérique)

Refonte de la stratégie `output` : remplacement du booléen `ignore_whitespace` par un discriminated union expressive `comparison: exact | text | numeric` avec presets, tolérance numérique abs+rel, shapes (flat/lines/grid), feedback `diff` détaillé.

| Commit      | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| `76b62d8f9` | feat : types + zod schemas                                         |
| `c903c8a4a` | feat : moteur JS pur de comparaison + 50 tests TDD                 |
| `d74188645` | feat : worker utilise compareOutputs (+ 2 tests Pyodide numérique) |
| `be028e3de` | feat : éditeur UX β (presets + panneau personnalisé)               |
| `ca9ecb7b3` | feat : affichage `diff` côté élève                                 |
| `7c488cd1e` | chore : migration UPDATE des seeds                                 |
| `1b6a1f08e` | docs : doc de progression                                          |

→ [output-comparison-v2-progress.md](../../wip/output-comparison-v2-progress.md)

---

## 2026-05-08 — Exercises Tests cachés

Champ `hidden?: boolean` sur `OutputTestCase` et `UnitTestCase`. Quand `true`, le worker redacte `input`/`expected`/`actual`/`diff` côté Pyodide avant `postMessage` — l'élève voit le verdict mais pas l'oracle. Anti-hardcoding et anti-reverse-engineering. Zod refuse une config dont tous les test_cases sont cachés.

| Commit      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `c028b34fd` | feat : types + zod schemas (avec refine)              |
| `232bdf3f6` | feat : `redactIfHidden` côté worker + 3 tests Pyodide |
| `f86b4ecb8` | feat : toggle "Caché" dans l'éditeur                  |
| `4a8ed3f68` | feat : rendu opaque (cadenas + label) côté résultat   |
| `a3dee1b7a` | docs : doc de progression                             |

→ [hidden-tests-progress.md](../../wip/hidden-tests-progress.md)

---

## 2026-05-09 — Exercises Soumissions persistées (Bloc A)

Branchement de `POST /submit` à l'UI élève. Soumissions assignées **et** libres (sur exos publics, sans assignment). Bouton "Soumettre" séparé du "Vérifier". Panneau historique. Endpoint `GET /my-submissions`.

| Commit      | Description                                                            |
| ----------- | ---------------------------------------------------------------------- |
| `dc3375dc1` | feat : RLS publique + `/submit` relâchée + `/my-submissions` (6 tests) |
| `bf6479131` | feat : bouton Soumettre + panneau historique côté élève                |
| `f47577619` | docs : doc de progression                                              |

→ [free-practice-submissions-progress.md](../../wip/free-practice-submissions-progress.md)

---

## 2026-05-09 — Exercises Comparateur Python custom (special judge)

4e variante au discriminated union `OutputComparison` : `{ kind: 'custom', code, timeout_ms? }`. Le prof écrit une fonction Python `compare(expected, actual, stdin) -> bool | dict` exécutée en namespace isolé pour chaque test case. Débloque les exos à solutions multiples valides, sortie non ordonnée, vérification structurelle. Niveau honneur (cohérent avec hidden tests).

| Commit      | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `786532831` | feat : types + zod CustomComparison                               |
| `b44cce46c` | feat : compareWithCustomScript dans worker + 5 tests Pyodide-réel |
| `abf112c8b` | feat : 9e preset "Comparateur Python (avancé)" dans l'éditeur     |
| `e06428c21` | docs : doc de progression                                         |

→ [custom-comparator-progress.md](../../wip/custom-comparator-progress.md)

---

## 2026-05-09 — Exercises Page d'édition (extraction ExerciseForm)

Nouvelle route `/python-exercises/[id]/edit` (author-only). Pour la créer sans dupliquer 250 LOC, extraction du formulaire de `/new` en composant réutilisable `ExerciseForm.svelte` qui prend `initialForm`, `mode: 'create' | 'edit'`, `cancelHref?` et `onSubmit`. La page `/new` passe de 322 → 56 LOC. Bouton crayon "Modifier" ajouté sur `/mine`.

| Commit      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `5a3ae80b9` | feat : ExerciseForm + /edit/[id] + bouton crayon sur /mine |

---

## 2026-05-09 — Exercises Tests API étendus (couverture 0% → ~90%)

Couverture des 7 endpoints API principaux du module python-exercises (création, listing, lecture, modification, suppression, assignation, soumission, résultats). 52 nouveaux tests serveur ajoutés (en plus des 11 préexistants : 5 GET[id] + 6 my-submissions), pour un total de **63 tests** sur l'API. 2 bugs latents fixés en passant : `searchParams.get(absent)` retournait `null` au lieu de `undefined` attendu par Zod `.optional()` sur GET liste et GET results.

| Commit      | Description                                                                            |
| ----------- | -------------------------------------------------------------------------------------- |
| `a52b72431` | test : POST + GET list (11 tests) + fix coercion null→undefined Zod                    |
| `449885f04` | test : PUT + DELETE (13 nouveaux tests sur le fichier [id]/server.test.ts)             |
| `6033e163b` | test : POST submit (9 tests, helper `mockCount` pour les queries `count: 'exact'`)     |
| `523ace9a1` | test : POST assign (11 tests, dont scénarios class XOR student et duplication PG23505) |
| `1153a04b7` | test : GET results (8 tests, dont agrégation best_attempt/latest_attempt)              |

**Reste à faire** : custom comparator V2 (unit_test + server-side strict), couverture détaillée des filtres GET list, drill-down soumissions, vue par élève, export CSV, realtime.

---

## 2026-05-09 — Exercises Mastery automatique (Bloc B)

Statut sticky `mastered` / `needs_review` (absence = `not_worked`) auto-dérivé des soumissions via trigger DB. Sticky-mastered : une fois acquis, jamais reverti (UPSERT `ON CONFLICT DO UPDATE WHERE status != 'mastered'`). Endpoints `GET /mastery` (global) et `GET /[id]/mastery` (par exo). Badge "Maîtrisé" / "À retravailler" affiché sur la page consultation côté élève.

| Commit      | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `b85f1068f` | feat : table `python_exercise_mastery` + trigger UPSERT auto sur INSERT |
| `bd1340b2e` | feat : endpoints global + per-exercise + 12 tests serveur               |
| `fc2bdb6c1` | feat : badge mastery côté consultation `/python-exercises/[id]`         |

---

## 2026-05-09 — Exercises Tags normalisation (math + Python)

Remplacement des colonnes `tags TEXT[]` par tables de jonction N-N. `exercises.tags` → `exercise_tags(exercise_id, tag_id)` ; `python_exercises.tags` → `python_exercise_tags(...)`. Catalogues `tags` et `python_tags` deviennent référentiels (FK CASCADE/RESTRICT). API contract préservé (`tags: string[]`) via résolution serveur. Auto-create silencieux des tags absents du catalogue à l'INSERT.

| Commit      | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `49980f4e3` | feat : migration création jonctions + data migration + drop colonnes        |
| `ac5693cdd` | feat : helpers `tags-resolution.ts` + APIs math + Python utilisent jonction |
| `5468f5e18` | fix : reconstruction de 4 fonctions SQL référençant `e.tags` droppé         |
| `1ba4f33ad` | fix : retrait `e.difficulty` (droppé en 20260121) des mêmes fonctions       |
| `40c4cdbcb` | fix : propage les échecs de sync junction (rollback INSERT, 500 sur PUT)    |
| `c84c99b1c` | test : 19 tests sur `tags-resolution.ts`                                    |

→ [tags-normalization-progress.md](../../wip/tags-normalization-progress.md)

---

## 2026-05-09 — Bilan de la journée

~13 commits sur le module python-exercises ont fermé l'arc pédagogique :

1. **Bloc C — résultats prof** (`/[id]/results`) : table par élève + cards stats
2. **Drill-down soumissions** (`/[id]/results/[student_id]`) : code + verdict détaillé pour chaque tentative
3. **Vue prof per-student cross-exos** (`/students/[student_id]`) : tous les exos de cet élève dans mon scope
4. **Dashboard élève** (`/my-progress`) : tous les exos sur lesquels j'ai une trace
5. **Refacto mastery 3 statuts** : alignement DB (mastered / needs_review / not_started) côté prof + élève
6. **Tags normalisation** : drop colonnes `TEXT[]`, jonctions N-N, fix RPCs cassées (e.tags + e.difficulty droppés)

État final du module : **complet pédagogiquement**. Backlog restant (CSV, realtime, custom V2) = low priority, à reprendre après feedback prof réel.

→ Voir les sections par feature ci-dessous, et [README.md](../README.md#4-exercises) pour le récap thématique.

---

## 2026-05-09 — Exercises Dashboard élève "Ma progression"

Route `/python-exercises/my-progress` : pendant côté élève des vues prof. L'élève voit tous les exos qu'il a touchés (submission, mastery row, ou assignment). Auth : students only (les profs sont redirigés vers `/python-exercises/mine`). UI miroir des dashboards prof avec 4 cards stats, filtres niveau + statut, table sortable, badges DB-aligned. Bouton "Ma progression" ajouté sur la page consultation pour les élèves (cohabite avec "Voir les résultats" pour les profs).

| Commit      | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| `d55358fe6` | feat : route + server load (7 tests TDD) + UI cards + table sortable |
| `3becb938a` | feat : bouton "Ma progression" sur la page consultation              |

→ [python-exercises-my-progress-progress.md](../../wip/python-exercises-my-progress-progress.md)

---

## 2026-05-09 — Exercises Mastery 3-status alignée DB

Refacto follow-up du Bloc C : remplacement du bucket applicatif `in_progress` par `needs_review` (qui est l'état DB sticky réel). Les pages prof (résultats par exo, vue par élève cross-exos) affichent désormais les **mêmes 3 statuts que la DB** — `mastered` / `needs_review` / `not_started` — avec les mêmes labels et couleurs que la page consultation côté élève. Élimine l'incohérence prof/élève (même donnée, mots différents) et supprime une couche d'abstraction artificielle. 5 tests ajustés.

| Commit      | Description                                                      |
| ----------- | ---------------------------------------------------------------- |
| `2a6b82883` | refactor : align teacher mastery labels with the DB (3 statuses) |

---

## 2026-05-09 — Exercises Vue par élève cross-exos

Route `/python-exercises/students/[student_id]` : vue d'ensemble pour un prof sur un élève donné, agrégeant tous les exos qui le concernent (exos qu'il a écrits ET sur lesquels l'élève a soumis, plus les exos qu'il a assignés directement ou via une classe contenant l'élève). Filtre niveau, tri colonnes, table avec lien drill-down, 4 cards stats globales. Lien "Voir tous ses exos" ajouté dans le header du drill-down `/results/[student_id]`.

| Commit      | Description                                                          |
| ----------- | -------------------------------------------------------------------- |
| `3633a2072` | feat : route + server load (8 tests TDD) + UI cards + table sortable |
| `1a6e7b6d5` | feat : bouton "Voir tous ses exos" sur drill-down                    |

→ [python-exercises-per-student-progress.md](../../wip/python-exercises-per-student-progress.md)

---

## 2026-05-09 — Exercises Drill-down soumissions élève

Route `/python-exercises/[id]/results/[student_id]` : le prof clique sur un nom dans la table résultats et arrive sur la page détail de cet élève (code soumis + verdict détaillé pour chaque tentative). Auth = même garde-fous que `/results` + scope check additionnel (l'élève doit être dans une classe du prof OU assigné directement). Submissions complètes (LIMIT 50), affichage en cards expandables avec PythonEditor read-only et `ExerciseValidationResult` réutilisé.

| Commit      | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| `a1b6970b0` | feat : route + server load (9 tests TDD) + UI cards expandables          |
| `633c1f5bd` | feat : nom de l'élève dans la table résultats devient un lien drill-down |

→ [python-exercises-drill-down-progress.md](../../wip/python-exercises-drill-down-progress.md)

---

## 2026-05-09 — Exercises Page résultats prof (Bloc C)

Route `/python-exercises/[id]/results` (auteur OU prof ayant assigné). Server load compose 4 sources DB en `StudentRow[]` : assignments + class_members + submissions + mastery. UI : 4 cards stats (total / mastered / in_progress / not_started + % maîtrise), filtre par classe (MySelect), table sortable par nom / tentatives / dernière activité, badges mastery. Lien "Voir les résultats" sur la page exo, visible uniquement aux profs avec accès.

Mapping mastery applicatif à 3 valeurs (`mastered` / `in_progress` / `not_started`) — `needs_review` DB collapsé en `in_progress`.

| Commit      | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `7b3e2ff89` | feat : server load TDD (14 tests, auth + merge + dédup + short-circuit) |
| `cf6ee807b` | feat : UI cards stats + table sortable + filtre classe                  |
| `e6820ea64` | feat : bouton "Voir les résultats" sur la page consultation             |
| `57fdadf1e` | docs : doc de progression                                               |

→ [python-exercises-results-page-progress.md](../../wip/python-exercises-results-page-progress.md)

---

## 2026-06 — Notebook V2 (checkpoints, PDF, présentation, templates)

Sprint d'intensification du notebook : ajout de cellules de vérification (3 modes + indices), export PDF via Typst, mode présentation plein écran (UbuSlides), et système de templates clonables.

| Commit      | Description                                                                          |
| ----------- | ------------------------------------------------------------------------------------ |
| `e14cecd07` | feat: teacher-authored hint revealed after 2 failed checkpoint runs                  |
| `8c56f1559` | chore: demo the new checkpoint hint feature in the seed script                       |
| `3ad883273` | feat: PDF export with Typst pipeline + markdown editor upgrade                       |
| `f9b4444f4` | fix: pass includeSetup:false to the markdown transpiler (no spurious page breaks)    |
| `43653044b` | chore: add a math-heavy cell to the demo to exercise the PDF export                  |
| `289f80a0d` | feat: full-screen presentation mode built on UbuSlides                               |
| `4a272d438` | fix: gate the present header pill behind notebookLoaded (executor reactivity)        |
| `b04a073f1` | fix: snapshot reactive proxies before postMessage to the worker ($state.snapshot)    |
| `9acc8b8a6` | fix: treat presentation mode as previewMode (skip checkpoint POST → no RLS friction) |
| `547c930ab` | chore(slides): use SvelteKit's replaceState for hash sync (no router warning)        |
| `1ceddf17a` | feat: templates gallery + clone + save-as                                            |

→ [../../wip/notebook-checkpoints-progress.md](../../wip/notebook-checkpoints-progress.md) — checkpoints V1 (3 modes + hint feature)
→ [../../wip/notebook-pdf-export-progress.md](../../wip/notebook-pdf-export-progress.md) — pipeline Typst + sécurité injection
→ [../../wip/notebook-presentation-progress.md](../../wip/notebook-presentation-progress.md) — mode présentation UbuSlides
→ [../../wip/notebook-templates-progress.md](../../wip/notebook-templates-progress.md) — templates V1 (gallery + clone + save-as)
→ [../../wip/notebook-ui-references.md](../../wip/notebook-ui-references.md) — benchmark Colab/Deepnote/Marimo + backlog UX
→ [../../wip/checkform-unified-progress.md](../../wip/checkform-unified-progress.md) — cosmetic AST transformers (réutilisés par les checkpoints)

---

## Récap par thème

| Thème                         | Docs principaux                                                                                                                                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playground                    | playground-progress, playground-improvements, phase1-4                                                                                                                                               |
| Sub-systems                   | autocomplete, lazy-loading, phase3-url-sharing, files                                                                                                                                                |
| Refactor commun               | executor-pattern, worker-multicontext, shared-types, validation                                                                                                                                      |
| Notebook (12 docs)            | notebook-complete, implementation, ui-\*, migration, routes, import, export, sharing, readonly, test-enhancement                                                                                     |
| Notebook V2 (6 docs, 2026-06) | notebook-checkpoints (hint feature), notebook-pdf-export (Typst), notebook-presentation (UbuSlides), notebook-templates, notebook-ui-references (benchmark), checkform-unified (cosmetic transforms) |
| Debugger                      | debugger-progress (Phases 1-6, heap viz incluse)                                                                                                                                                     |
| Exercises                     | exercises-api-progress, validation-implementation, output-v2, hidden-tests, free-practice-submissions, custom-comparator, edit-page, mastery (Bloc B), tags-normalization, results-page (Bloc C)     |
| Examples Library              | examples-library-progress                                                                                                                                                                            |

---

## Métriques

- **Commits totaux** : ~150+ (depuis 2025-12-04)
- **Migrations DB** : 16 (4 initiales + 10 sur exercises Python + **2 sur notebook V2** : checkpoint_runs table + is_template/template_category columns)
- **Tests** : 580+ (45 store + 36 output + 124+ debug + 25 library + 59 import/export + 50 output-compare + 22 Pyodide-réel exercises + 63 server tests exercises + **20 CheckpointCell + 14 Zod notebooks + 38 NotebookGenerator + 7 PDF filename**)
- **Exemples curés** : 100 (10 catégories)
- **Composants Svelte** : ~40 (playground + notebook + debug + exercises + **checkpoint + presentation + templates V2**)
- **API endpoints** : ~25 (incluant `/checkpoint-runs`, `/python-notebook-templates`, `/from-template`, `/save-as-template`)
- **Exercices seedés** : 5 (1 par stratégie + ast+output_tests) + 28 Bac
- **Stratégies de comparaison output** : 4 (`exact`, `text`, `numeric`, `custom`) avec 8 presets dans l'éditeur
- **Modes checkpoint notebook** : 3 (`assert`, `unit_test`, `variable_check`) — surface mince qui réutilise la brique `validateExercise`
