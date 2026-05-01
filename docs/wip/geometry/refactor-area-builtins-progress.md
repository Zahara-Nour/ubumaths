# Refactor area builtins (V4) — progression

> **Étude** : `docs/wip/geometry/refactor-area-builtins-study.md` > **Prompt** : `docs/wip/geometry/prompt-refactor-area-builtins.md`

---

## État actuel

| Phase                      | Statut      | Tests                                                                     | Commit                                       |
| -------------------------- | ----------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| 0 — Étude                  | ✅ Validée  | —                                                                         | (étude rédigée et validée par l'utilisateur) |
| 1 — Helper isolé           | ✅ Terminée | 16 verts (helper) + 62 existants (integrale 20 / aire 21 / aire_entre 21) | a5447a10                                     |
| 2 — Migration `integrale`  | ✅ Terminée | 20 V1 verts + 16 helper + 42 autres = 78                                  | 5cb4ce4b                                     |
| 3 — Migration `aire`       | ✅ Terminée | 21 V2 (incluant polygone) + 16 helper + 41 autres = 78                    | (à venir)                                    |
| 4 — Migration `aire_entre` | ⏳ À faire  | 21 V3                                                                     | —                                            |
| 5 — Quality checks         | ⏳ À faire  | tous                                                                      | —                                            |

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

## Prochaines étapes (Phase 4)

Migrer `case 'aire_entre'` (`builtins.ts:~1742-1850` après Phase 3).
Validation `f` ET `g` (avec messages déjà alignés `'le 1er argument'` /
`'le 2e argument'`). Appel helper avec `g` défini, `signed: false,
defaultColor: '#fb923c'`. Vérifier 21 tests V3 verts + nombre de warns
(2) préservé.

---

## Crash recovery

En cas de crash de session, reprendre ici :

- Phase 1 (helper) committée a5447a10.
- Phase 2 (integrale) committée (commit à venir).
- Restant : Phase 3 (aire), Phase 4 (aire_entre), Phase 5 (quality checks).
- Tests verts : 78/78.
- Q1-Q4 arbitrées.
