# Palier 2c — Spec figée : cas spéciaux quadratiques

**Statut** : V1 spec validée 2026-05-06 (palier 2c, follow-up de palier 2b
livré dans `f32893cff`). Scope B (3 sous-cas) confirmé par l'utilisateur.

## Objectif

Ajouter trois raccourcis pédagogiques au stepper inéquation quadratique
(`generateQuadraticInequalitySteps`) qui évitent de passer par Δ quand
la forme du polynôme se prête à une résolution plus directe. C'est
exactement le même choix que fait le pipeline équation (`detectCase`
dans `quadratic.ts`) — palier 2c étend ce pattern aux inéquations.

## Scope V1

### IN — 3 sous-pipelines

#### A. `b = 0` → forme `ax² + c ⊻ 0` (~5 comportements)

Pas de Δ. On isole `x²`, on conclut directement (pas de tableau de signes).

| #   | Inéquation    | Solution                                             |
| --- | ------------- | ---------------------------------------------------- |
| 1   | `2x² − 8 < 0` | `]−2 ; 2[`                                           |
| 2   | `2x² − 8 ≥ 0` | `]−∞ ; −2] ∪ [2 ; +∞[`                               |
| 3   | `x² + 1 < 0`  | `∅` (carré strictement négatif impossible)           |
| 4   | `x² + 1 ≥ 0`  | `ℝ` (carré toujours ≥ 0 ≥ −1)                        |
| 5   | `−x² + 4 > 0` | `]−2 ; 2[` (a < 0, on multiplie par −1 dans la tête) |

**Pipeline** : identify-equation → standardize (si nécessaire) →
recognize-no-linear-term → isolate-square → **inequality-conclude-from-isolated-square** (NEW).

#### B. `c = 0` → forme `ax² + bx ⊻ 0` (~3 comportements)

Pas de Δ. On factorise par `x`, on dresse le tableau de signes avec les
deux racines `0` et `−b/a`.

| #   | Inéquation              | Racines | Solution               |
| --- | ----------------------- | ------- | ---------------------- |
| 6   | `x² − 5x < 0`           | 0, 5    | `]0 ; 5[`              |
| 7   | `x² + 3x ≥ 0`           | −3, 0   | `]−∞ ; −3] ∪ [0 ; +∞[` |
| 8   | `−2x² + 4x > 0` (a < 0) | 0, 2    | `]0 ; 2[`              |

**Pipeline** : identify-equation → standardize → recognize-no-constant-term
→ factor-common-x → quadratic-sign-table (réutilisé) →
inequality-conclude-quadratic (réutilisé).

#### C. Forme déjà factorisée `(αx + β)(γx + δ) ⊻ 0` (~2 comportements)

Pas de Δ ni de standardisation. On reconnaît la forme factorisée AVANT
toute manipulation, on extrait les racines des deux facteurs linéaires,
on dresse le tableau de signes.

| #   | Inéquation            | Racines extraites | Solution               |
| --- | --------------------- | ----------------- | ---------------------- |
| 9   | `(x − 1)(x − 3) < 0`  | 1, 3              | `]1 ; 3[`              |
| 10  | `(2x + 4)(x − 1) > 0` | −2, 1             | `]−∞ ; −2[ ∪ ]1 ; +∞[` |

**Pipeline** : identify-equation → recognize-factored → quadratic-sign-table
(racines extraites, `a = α·γ` pour le coefficient dominant) →
inequality-conclude-quadratic.

### OUT (V1.1+ ou hors scope)

- Cas `(αx + β)² ⊻ 0` (carré parfait factorisé) — V1 fall-back vers Δ-path
- Forme `a(x − x₁)(x − x₂) ⊻ 0` avec `a` non-1 sortant en facteur — fall-back Δ
- Inéquations rationnelles, paramétriques (paliers 3+, 2d)

## Nouvelle op kind

```ts
| {
    readonly kind: 'inequality-conclude-from-isolated-square';
    /** Le polynôme isolé sous la forme `x² ⊻ k` (ou `(±)x² ⊻ k`) */
    readonly isolatedSquare: MathNode;       // tipiquement variable au carré
    readonly comparedConstant: MathNode;     // la constante à droite après isolation
    readonly relation: '<' | '>' | '<=' | '>=' | '!=';
    /** Signe du coefficient `a` original (avant division) — pour le rendu pédagogique. */
    readonly originalASign: '+' | '-';
    /** Description textuelle Unicode-safe de S (rendue par escapeLatexBacktickFreeText). */
    readonly solutionDescription: string;
  }
```

Le renderer formate :

- `S = ]−√k ; √k[` quand applicable (constante ≥ 0)
- `S = ∅` ou `S = ℝ` selon le cas trivial
- `S = ]−∞ ; −√k[ ∪ ]√k ; +∞[` pour les complémentaires

## Décisions verrouillées (par défaut)

| Q                    | Décision                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Détection            | Réutiliser `detectCase` de `quadratic.ts` en l'exportant `_detectCase` (style underscore-prefixed comme les autres helpers du palier 2b). |
| Régression palier 2b | Comportements 20 + 21 du spec palier 2b passent désormais par le fast-path. Snapshots Mode B regénérés.                                   |
| Stratégie            | Activer par défaut, pas de flag opt-in. Cohérent avec le pipeline équation qui n'a pas de flag non plus.                                  |
| Cas `(αx + β)² ⊻ 0`  | Fall-back vers Δ-path en V1 — ajouter un commentaire `TODO V1.1`.                                                                         |

## Architecture

`generateQuadraticInequalitySteps(ineq, opts)` :

```
1. Validation (operator, variable, paramétrique)
2. Standardize → standardForm
3. Cas a=0 → délégation linéaire
4. Cas factorisé (avant standardize) → branch C
5. Détection b=0 / c=0 / standard via _detectCase :
   - case='b-zero'    → branch A
   - case='c-zero'    → branch B
   - case='factored'  → branch C
   - sinon            → Δ-path (palier 2b)
```

**Helpers réutilisés** : `_buildStandardizeStep`, `_buildIdentifyCoefficientsStep`
(optionnel pour A/B/C), `extractQuadraticCoefficients` (pour C, factor extraction).

**Nouveaux helpers internes** dans `quadratic-inequality.ts` :

- `buildRecognizeStep(case, …)` — émet l'étape `recognize-*`
- `buildIsolateSquareStep(...)` — émet `isolate-square` (réutilise le kind du palier 2b équation si possible)
- `buildFactorCommonXStep(...)` — émet `factor-common-x`
- `buildConcludeFromIsolatedSquareStep(...)` — émet la nouvelle kind
- `extractFactoredRoots(factors)` — extrait `α, β` depuis `(x − α)(x − β)`

## Tests cibles (Phase 1 — failing first)

- A1-A5 : 5 inéquations `b = 0`
- B1-B3 : 3 inéquations `c = 0`
- C1-C2 : 2 inéquations factorisées
- 3 régressions équation (palier 2b ne doit pas casser)
- 2 régressions structurelles (le pipeline standard reste joignable pour `ax² + bx + c` "vraiment standard" type `x² − 5x + 6 < 0`)

Total : ~13 tests palier 2c + 0 régression palier 2b.

## Vérifications

- [ ] 31 tests palier 2b → 31 (régression 0)
- [ ] +13 tests palier 2c → 44 quadratic-inequality tests
- [ ] Snapshots Mode B : comportement `2x²−8` et `(x−1)(x−3)` regénérés
- [ ] CLI demo : catégories `special` et `factored` produisent un step-flow plus court
