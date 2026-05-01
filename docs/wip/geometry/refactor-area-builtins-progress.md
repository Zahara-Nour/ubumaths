# Refactor area builtins (V4) — progression

> **Étude** : `docs/wip/geometry/refactor-area-builtins-study.md` > **Prompt** : `docs/wip/geometry/prompt-refactor-area-builtins.md`

---

## État actuel

| Phase                      | Statut      | Tests                                                                     | Commit                                       |
| -------------------------- | ----------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| 0 — Étude                  | ✅ Validée  | —                                                                         | (étude rédigée et validée par l'utilisateur) |
| 1 — Helper isolé           | ✅ Terminée | 16 verts (helper) + 62 existants (integrale 20 / aire 21 / aire_entre 21) | a5447a10                                     |
| 2 — Migration `integrale`  | ✅ Terminée | 20 V1 verts + 16 helper + 42 autres = 78                                  | 5cb4ce4b                                     |
| 3 — Migration `aire`       | ✅ Terminée | 21 V2 (incluant polygone) + 16 helper + 41 autres = 78                    | b7372ae5                                     |
| 4 — Migration `aire_entre` | ✅ Terminée | 21 V3 + 16 helper + 41 autres + 33 singularité = 111                      | 2a15dab3                                     |
| 5 — Quality checks         | ✅ Terminée | check:incremental + eslint passants sur fichiers refactorés               | (à venir)                                    |

> **Note sur le compte de tests** : l'étude annonçait `96 + 19 + 21 = 136`,
> mais les comptes réels mesurés au début de Phase 1 sont
> `20 + 21 + 21 = 62` tests d'intégration sur les 3 cases. La différence
> vient probablement d'une comptabilisation incluant des tests de
> sub-modules (factory, singularity-warn) que le refactor ne touche pas
> de toute façon. Le filet est plus court que prévu mais largement
> suffisant pour détecter une régression sur l'orchestration DSL.

---

## Décisions arbitrées par l'utilisateur (avant Phase 1)

- **Q1** — Aligner les messages : oui (`'le 1er argument'` partout).
  Sera appliqué en Phase 2-4.
- **Q2** — `resolveBoundParam` interne au module : oui.
- **Q3** — Garde-fou `g + signed=true` → throw `Error` (pas
  `DslRuntimeError`).
- **Q4** — Signature minimaliste `{ id, expression }` : oui.

---

## Phase 1 — détails

### Fichiers créés

- `src/lib/geometry-core/dsl/area-builtin-helper.ts` (~150 lignes)
- `src/lib/geometry-core/dsl/__tests__/area-builtin-helper.test.ts`
  (16 tests, ~400 lignes)

### Fichiers modifiés

Aucun. La Phase 1 est un ajout pur — les 3 cases DSL sont intacts.

### Spec TDD couverte (13 comportements de l'étude → 16 tests)

- **A. Trois modes** (3 tests : A1, A2, A3) — vérifient signed,
  secondFunctionId, color, valeur scalar.
- **B. Bornes** (6 tests : B4, B5, B6×3 paramétré sur 3 noms, B7) —
  numérique, slider réactif, élément non-scalar/slider rejeté avec
  préfixe correct, type ResolvedValue non supporté rejeté.
- **C. Discontinuités** (2 tests : C8, C9) — pole interne → NaN, propre
  → fini.
- **D. Garde-fou interne** (1 test : D10) — `g + signed=true` →
  `Error` non `DslRuntimeError`.
- **E. Warns** (3 tests : E11a, E11b, E12) — comptes 1/1/2 et préfixes
  builtin corrects.
- **F. Factory error** (1 test : F13) — re-throw `DslRuntimeError` avec
  préfixe.

### Code review (code-reviewer agent, modèle Sonnet)

Verdict : **FIX puis GO** Phase 2. Findings principaux appliqués :

1. **MAJOR** — JSDoc sur `defaultColor` clarifiant que c'est la
   responsabilité du callsite d'envoyer la bonne couleur (helper ne
   fait PAS de table par nom). ✅ Appliqué.
2. **MAJOR** — JSDoc sur `signed` notant la différence structurelle
   avec V1 integrale (qui utilise le défaut factory). ✅ Appliqué.
3. **MINOR** — Dead code `P = point(0, 0)` + `void idOf('P')` retiré
   du test F13. ✅ Appliqué.

Findings non appliqués (jugés OK) :

- BLOCKER (downgradable) sur `name` passé explicitement à
  `warnIfSingularitySuspected` : aucun changement observable, simple
  divergence structurelle entre V1 et helper.
- NIT sur tuple/geoValue non testés : couvert implicitement par B7.

### Tests

- Helper : **16 verts** (16/16, 0 régression).
- Existants : **62 verts** (20 + 21 + 21, 0 régression — non touchés).

---

## Phase 2 — détails

### Fichiers modifiés

- `src/lib/geometry-core/dsl/builtins.ts` :
  - Import ajouté : `import { interpretAreaBuiltin } from './area-builtin-helper';`
  - `case 'integrale'` (lignes 1719-1801, 82 lignes) → 22 lignes (gain 60).
  - Message aligné Q1 : `'le premier argument'` → `'le 1er argument'`
    (aucun test ne l'asserte, vérifié par grep).

### Code review (Phase 2)

Verdict : **GO Phase 3**. Aucun blocker/major. Findings :

- Minor : `resolveBoundParam` dupliqué subsiste dans `case 'aire'` et
  `case 'aire_entre'` — sera retiré en Phases 3 et 4 (connu).
- Nit : changement de message non testé donc safe ; améliore aussi
  l'homogénéité avec les autres builtins.

### Tests

- Integrale V1 : **20 verts** (0 régression).
- Helper : **16 verts**.
- Aire V2 + aire_entre V3 (non touchés) : **42 verts**.
- **Total : 78/78 verts.**

---

## Phase 3 — détails

### Fichiers modifiés

- `src/lib/geometry-core/dsl/builtins.ts` :
  - `case 'aire'` (lignes 1119-1216, 95 lignes) → 36 lignes (gain 59).
  - Branche courbe : appel `interpretAreaBuiltin` (signed=false, defaultColor='#22c55e').
  - Branche polygone : intacte (fallthrough silencieux préservé).

### Code review (Phase 3)

Verdict : **GO Phase 4**. Aucun blocker/major. Findings :

- Nit : commentaire mentionne `applyInlineStyle`/`resolveStyle` (noms
  internes, sensibles au rename). Non-bloquant.
- Branche polygone : confirmée byte-for-byte identique avant/après.
- 5 points de vérification (helper + polygone + couleur + commentaire
  - imports) tous OK.

### Tests

- Aire V2 (incluant section A polygone) : **21 verts** (0 régression).
- Helper : **16 verts**.
- Integrale + aire_entre : **41 verts** (non touchés).
- **Total : 78/78 verts.**

---

## Phase 4 — détails

### Fichiers modifiés

- `src/lib/geometry-core/dsl/builtins.ts` :
  - `case 'aire_entre'` (lignes 1681-1789, 108 lignes) → 36 lignes (gain 72).
  - Validation `f` ET `g` (avec messages déjà alignés `'le 1er argument'`
    / `'le 2e argument'`).
  - Appel `interpretAreaBuiltin` avec `g` défini, `signed: false,
defaultColor: '#fb923c'`.
  - **Imports retirés (orphelins)** : `warnIfSingularitySuspected`,
    `getAllDiscontinuities`, `Discontinuity`. Plus aucun usage dans
    `builtins.ts` après les 3 migrations.

### Code review (Phase 4)

Verdict : **GO Phase 5**. Aucun blocker/major/minor/nit. Migration
textbook : validation au callsite, logique déléguée, mapping arguments
exact, cleanup imports laisse zéro orphelin.

### Tests

- Aire_entre V3 : **21 verts** (0 régression).
- Helper : **16 verts**.
- Integrale + aire V2 (non touchés) : **41 verts**.
- Singularité (warn + nan, non touchés) : **33 verts**.
- **Total : 111/111 verts.**

---

## Phase 5 — détails

### Quality checks

- `pnpm check:incremental` : 9 errors, 539 warnings, 139 fichiers avec
  problèmes — **tous pré-existants**. Aucune erreur ni warning ajouté
  par les fichiers du refactor (vérifié par grep
  `area-builtin-helper|builtins.ts` sur la sortie : 0 hits).
- `npx eslint` sur les 3 fichiers (helper, tests helper, builtins.ts) :
  0 erreur, 0 warning.

### Métriques finales avant / après

**`src/lib/geometry-core/dsl/builtins.ts`** :

| Élément                                      | Avant | Après | Gain |
| -------------------------------------------- | ----- | ----- | ---- |
| Total fichier                                | 2609  | 2413  | -196 |
| `case 'integrale'`                           | 82    | 22    | -60  |
| `case 'aire'`                                | 95    | 36    | -59  |
| `case 'aire_entre'`                          | 108   | 36    | -72  |
| Imports `singularity-warn` + `Discontinuity` | 3     | 0     | -3   |

**Nouveau code consolidé** :

- `src/lib/geometry-core/dsl/area-builtin-helper.ts` : **138 lignes**
  (incluant types, JSDoc et `resolveBoundParam`).
- `src/lib/geometry-core/dsl/__tests__/area-builtin-helper.test.ts` :
  **394 lignes** (16 tests d'isolation, +394 lignes de couverture
  nouvelle).

**Bilan** :

- **Code production** : -196 + 138 = **-58 lignes nettes**.
- **Tests ajoutés** : +394 lignes (16 tests d'isolation jamais
  existants pour le pattern partagé).
- **Duplication éliminée** : `resolveBoundParam` (~26 lignes × 3 = 78
  lignes répétées) consolidée en une seule définition.
- **Coût ajout futur** : un 4e builtin de la même famille
  (e.g. `aire_intersection`) coûte désormais ~10-15 lignes au lieu de
  ~95 (gain estimé de l'étude confirmé).

### Récapitulatif des commits

| Phase | Commit      | Description                                               |
| ----- | ----------- | --------------------------------------------------------- |
| 1     | a5447a10    | Helper `interpretAreaBuiltin` + 16 tests isolés           |
| 2     | 5cb4ce4b    | Migration `case 'integrale'` (alignement Q1 du message)   |
| 3     | b7372ae5    | Migration `case 'aire'` branche courbe (polygone intact)  |
| 4     | 2a15dab3    | Migration `case 'aire_entre'` + cleanup imports orphelins |
| 5     | (ce commit) | Quality checks + doc finale                               |

### Tests finaux

- **111 tests verts** : 16 helper + 20 integrale V1 + 21 aire V2 + 21
  aire_entre V3 + 33 singularité (warn + nan).
- **0 régression** sur l'ensemble du périmètre du refactor.

---

## Documents produits

- `docs/wip/geometry/prompt-refactor-area-builtins.md` — prompt source.
- `docs/wip/geometry/refactor-area-builtins-study.md` — étude Phase 0
  (signature, plan TDD, Q1-Q4).
- `docs/wip/geometry/refactor-area-builtins-progress.md` — ce document.

Aucune doc utilisateur produite (refactor invisible côté DSL — confirmé
par le prompt initial).

---

## Crash recovery

Refactor V4 **terminé**. Toutes les phases committées :

- Phase 1 — a5447a10
- Phase 2 — 5cb4ce4b
- Phase 3 — b7372ae5
- Phase 4 — 2a15dab3
- Phase 5 — (ce commit)

Tests verts : 111/111. Aucune régression.
