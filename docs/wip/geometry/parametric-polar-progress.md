# V2 paramétrique — Forme polaire `courbe()` (en cours)

> Plan source : `docs/wip/geometry/prompt-parametric-polar.md`
> V1 paramétrique livrée : `docs/wip/geometry/parametric-curves-v1-progress.md`

## Spec validée (Phase 0 — 2026-05-02)

### Surface API

```
courbe("r = 2*cos(theta)", theta_min=0, theta_max=pi)
courbe("r = 1 - cos(theta)", theta_min=0, theta_max=2*\pi)            # cardioïde
courbe("r = 1 + 2*cos(theta)", theta_min=0, theta_max=2*\pi)          # limaçon
courbe("r = sin(2*theta)", theta_min=0, theta_max=2*\pi)              # rosace 4 pétales
courbe("r = theta", theta_min=0, theta_max=6*\pi)                     # spirale d'Archimède
```

### Décisions tranchées

| #   | Question                   | Décision                                                                                                                                                 | Rationale                                                                                               |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Q1  | Sérialisation              | **Option β** : `polar?: boolean` + `equationR?: string` sur `GeoParametricCurve`. Serializer reproduit `courbe("r = ...", theta_min=..., theta_max=...)` | Round-trip lisible, confiance utilisateur                                                               |
| Q2  | Mode angle                 | **Forcer `radians` localement** dans la branche polaire                                                                                                  | Convention universelle pour courbes polaires ; éviter bugs silencieux si `unite_angle("degrees")` actif |
| Q3  | Variable canonique interne | **`theta` ASCII**                                                                                                                                        | Cohérent avec `t` paramétrique, plus simple pour différenciation/free-vars/dependsOn                    |
| Q4  | Tokenisation               | **Pré-substitution textuelle** : accepter `theta` ET `\theta` à l'entrée, normaliser en `theta` interne                                                  | Pattern déjà utilisé pour `phi` ; user-friendly                                                         |

### Comportements validés

1. **Détection branche polaire** : 1 string positionnelle + présence d'au moins un de `theta_min`/`theta_max` dans les nommés.
2. **Bornes** : `theta_min < theta_max`, scalaires/sliders/numériques (mêmes règles que `t_min`/`t_max`).
3. **Auto-détection variable** : variable libre du RHS doit être `theta` (après pré-substitution). Sinon → erreur.
4. **Réécriture interne** : parser `r = f(θ)` → construire `xRhs = f(θ)·cos(θ)`, `yRhs = f(θ)·sin(θ)` au niveau MathNode → réutiliser machinerie paramétrique V1 via helper commun `buildParametricCurveFromXY`.
5. **Sampling** : aucun changement (sampleParametric2D inchangé).
6. **Détection courbe fermée** : aucun changement (cardioïde fermée sur `[0, 2π]`, spirale non fermée sur `[0, 6π]`).

### Erreurs DSL francophones

- `r = ...` sans `theta_min`/`theta_max` → `theta_min et theta_max obligatoires pour une courbe polaire`
- `theta_min ≥ theta_max` → `theta_max doit être strictement supérieur à theta_min`
- `r = ...` mais variable libre ≠ θ → `paramètre polaire attendu : theta (ou \theta)`
- `r = ...` avec `t_min/t_max` → `pour une courbe polaire, utiliser theta_min/theta_max (pas t_min/t_max)`
- 2 strings dont une `r = ...` → `r = ... attendu seul (pas avec une équation x= ou y=)`

## Plan d'exécution

| Phase | Description                                            | Agent                    | Statut |
| ----- | ------------------------------------------------------ | ------------------------ | ------ |
| 0     | Spec validée + doc de progression                      | (interactif)             | ✅     |
| 1     | Tests TDD red-first (`courbe-polar.test.ts`, 18 tests) | test-automator           | ✅     |
| 2     | Refactor helper commun + branche polaire dans builtin  | backend-developer (Opus) | ✅     |
| 3     | Sérialisation polaire (option β) + tests round-trip    | (fait dans Phase 2)      | ✅     |
| 4     | Code review + 6 edge cases ajoutés                     | code-reviewer            | ✅     |
| 5     | Demo page : section "Courbes polaires"                 | frontend-developer       | —      |
| 6     | Doc V2 livrée + memory update                          | (direct)                 | —      |
| 7     | Quality checks (eslint + check:incremental)            | (direct)                 | —      |

## Fichiers concernés

**Créés**

- `src/lib/geometry-core/dsl/__tests__/courbe-polar.test.ts`

**Modifiés**

- `src/lib/geometry-core/dsl/builtins.ts` — branche polaire + helper `buildParametricCurveFromXY`
- `src/lib/geometry-core/types/elements.ts` — `polar?`, `equationR?` sur `GeoParametricCurve`
- `src/lib/geometry-core/types/schemas.ts` — Zod schema mis à jour
- `src/lib/geometry-core/graph/figure.ts` — `createParametricCurve` accepte les nouveaux champs
- `src/lib/geometry-core/dsl/serializer.ts` — cas polaire dans `parametricCurve`
- `src/routes/(public)/geometry-demo/parametric/+page.svelte` — section polaire
- `docs/wip/geometry/parametric-curves-v1-progress.md` — section "V2 livrée"

## Pièges connus

- `theta` ASCII tokenizé en `t·h·e·t·a` par mathAST → pré-substitution `\btheta\b` → `\theta` AVANT `parseCustom`, ou substitution dans le sens inverse selon stratégie.
- `BACKSLASH_WHITELIST` du tokenizer DSL ne contient que `pi` → `\theta` reste compatible uniquement à l'**intérieur** d'une chaîne d'équation.
- Pattern `for (const p of points) expect(...)` passe à vide si la collection est vide → toujours assertir `length > N` AVANT d'itérer (cf. fix `9279b2b64`).

## Tests existants à NE PAS casser

- `figure-parametric.test.ts`
- `figure-parametric-reactivity.test.ts`
- `parametric-curve-svg.test.ts`
- `courbe-parametric.test.ts`
- `dsl-courbe-with-variables.test.ts`
- `parametric-exports.test.ts`

## Critère de succès

- 5 exemples polaires affichés correctement sur `/geometry-demo/parametric`
- Tous les tests existants passent (V1 paramétrique + cartésien + autres)
- 0 régression sur `pnpm test:server src/lib/geometry-core/`
- 0 erreur sur `pnpm check:incremental`
- Sérialisation round-trip préserve la forme polaire (option β)

---

## Journal

### 2026-05-02 — Phase 0 ✅

- Spec validée par l'utilisateur (4 décisions Q1–Q4)
- Tasks créées (#1–#8)
- Doc de progression créée

### 2026-05-02 — Phase 1 ✅

- Fichier créé : `src/lib/geometry-core/dsl/__tests__/courbe-polar.test.ts` (321 lignes, 18 tests)
- Sections : A nominal (5), B LaTeX `\theta` (1), C réactivité (2), D erreurs (6), E sérialisation (2), F sampling (2)
- **Red-first validé** : 18/18 tests échouent
- Sampling utilise `figure.computeParametricCurveSampling(curveId)`
- Commit `fb449626b`

### 2026-05-02 — Phases 2+3 ✅

**Implémentation (backend-developer Opus)**

- `types/elements.ts` — `polar?: boolean` + `equationR?: string` sur `GeoParametricCurve`
- `graph/figure.ts` — `createParametricCurve` accepte `polar?` et `equationR?` (additif, backward-compat)
- `dsl/builtins.ts` :
  - Refactor : extraction de 3 helpers communs (`substituteStaticBindings`, `resolveAndValidateBounds`, `buildParametricCurveFromXY`)
  - `case 'courbe'` : détection branche polaire (1 string + `theta_min`/`theta_max` ou détection LHS `r =`)
  - `normalizeThetaToLatex(eq)` : pré-substitution `theta` ASCII → `\theta` LaTeX (lookbehind négatif)
  - `parsePolarEquation(eq, line)` + `createPolarCurveFromEquation(...)` : validations D1/D2/D3/D4/D6 + construction `xRhs = f(θ)*cos(θ)`, `yRhs = f(θ)*sin(θ)` au niveau MathNode (radians forcés)
- `dsl/serializer.ts` — branche `parametricCurve` : si `polar === true && equationR`, produit `courbe("r = ...", theta_min=..., theta_max=...)`

**Décisions clés**

- Pré-substitution `\btheta\b` avec lookbehind négatif `(?<![\\\w])` pour ne pas toucher `\theta` ni les mots englobants
- Mode angle radians : pas de `applyAngleMode` dans la branche polaire
- Construction MathNode directe via `multiply(rhs, cos(greek('theta')))` — pas de string concat
- Différenciation : `containsVariable` traite `GreekLetterNode` comme constante → dérivées zéro → sampler tombe sur uniforme (bénin et désormais documenté en commentaire)

**Code review**

Verdict : ✅ APPROVED WITH SUGGESTIONS (4 critiques)

- Critique 1 (MOYEN) : différenciation symbolique zéro pour theta grec → fallback sampling uniforme silencieux. **Action** : commentaire ajouté dans `createPolarCurveFromEquation`.
- Critiques 2 & 3 (MINEUR) : skip (optimisations prématurées).
- Critique 4 (MOYEN) : pas de test `unite_angle("degrees")` non-régression → test G4 ajouté.

**6 edge cases ajoutés (section G de courbe-polar.test.ts)**

- G1 : `theta_min` négatif `[-π, π]` accepté
- G2 : `r = -1` négatif constant (cercle, phase inversée)
- G3 : slider dans `r =` ET dans `theta_max` (dependsOn contient les deux)
- G4 : `unite_angle("degrees")` actif → courbe polaire reste en radians (non-régression)
- G5 : `theta_min == theta_max` lève D2
- G6 : sliders dans les deux bornes (D2 skipped, dependsOn contient les deux)

**Tests**

- 24/24 polar tests passing
- 87/87 régression (parametric, serialize-curves, roundtrip) passing
