# Palier 3 — Spec figée : inéquations rationnelles

**Statut** : V1 spec validée 2026-05-06.
**Plan source** : `~/.claude/plans/melodic-wiggling-lecun.md`.

## Objectif

Étendre le pipeline pédagogique d'UbuMaths aux inéquations rationnelles
`P(x) / Q(x) ⊻ 0` selon la méthode standard du programme français de 1ère et
Terminale spécialité maths : domaine de définition, racines du numérateur,
zéros du dénominateur, tableau de signes combiné à 4 lignes, lecture de S.

## Scope V1

### IN — 14 comportements

#### A. Linéaire / linéaire — le cas standard du programme (6 cas)

| #   | Inéquation         | Solution                                      |
| --- | ------------------ | --------------------------------------------- |
| 1   | `(x−1)/(x−3) < 0`  | `S = ]1 ; 3[`                                 |
| 2   | `(x−1)/(x−3) > 0`  | `S = ]−∞ ; 1[ ∪ ]3 ; +∞[`                     |
| 3   | `(x−1)/(x−3) ≤ 0`  | `S = [1 ; 3[` (1 inclus, 3 exclu — zéro de Q) |
| 4   | `(x−1)/(x−3) ≥ 0`  | `S = ]−∞ ; 1] ∪ ]3 ; +∞[`                     |
| 5   | `1/(x−2) < 0`      | `S = ]−∞ ; 2[` (P constant > 0)               |
| 6   | `(2x+1)/(x−1) ≠ 0` | `S = ℝ \ {−1/2 ; 1}`                          |

#### B. Quadratique / linéaire (2 cas)

| #   | Inéquation         | Racines P    | Zéro Q | Solution                                                  |
| --- | ------------------ | ------------ | ------ | --------------------------------------------------------- |
| 7   | `(x²−4)/(x−1) < 0` | ±2           | 1      | `S = ]−∞ ; −2[ ∪ ]1 ; 2[`                                 |
| 8   | `(x²+1)/(x−3) < 0` | aucune (Δ<0) | 3      | `S = ]−∞ ; 3[` (P > 0 toujours, donc P/Q a le signe de Q) |

#### C. Linéaire / quadratique (1 cas)

| #   | Inéquation     | Racine P | Zéros Q | Solution                  |
| --- | -------------- | -------- | ------- | ------------------------- |
| 9   | `x/(x²−1) ≥ 0` | 0        | ±1      | `S = ]−1 ; 0] ∪ ]1 ; +∞[` |

#### D. Forme non-standard — canonisable en P/Q (1 cas)

| #   | Inéquation        | Forme canonique                                                  | Solution       |
| --- | ----------------- | ---------------------------------------------------------------- | -------------- |
| 10  | `(x−1)/(x−3) < 1` | `2/(x−3) < 0` (après réduction au même dénominateur par `canon`) | `S = ]−∞ ; 3[` |

#### E. Erreurs / rejets (4 cas)

| #   | Input               | Erreur attendue                                                                    |
| --- | ------------------- | ---------------------------------------------------------------------------------- |
| 11  | `1/x + 1/(x−1) < 0` | `InequalityNotSolvable` (forme multi-fraction non réduite à `P/Q` — V1 hors scope) |
| 12  | `(x³−1)/(x−1) < 0`  | `InequalityNotSolvable` (deg P > 2)                                                |
| 13  | `(mx+1)/(x−2) < 0`  | `InequalityNotSolvable` (paramétrique)                                             |
| 14  | `(x−1)/(x−3) = 0`   | `PedagogicalInequalityError` (égalité non-inéquation)                              |

### OUT (V1.1+)

- Multi-fractions nécessitant réduction au même dénominateur (cas 11)
- `deg P > 2` ou `deg Q > 2`
- Coefficients paramétriques (lettres autres que la variable de résolution)
- Sub-steps inline détaillant Δ pour les racines de P ou Q (en V1, on les calcule silencieusement et on liste juste les valeurs)
- Cas dégénéré `Q = 0 partout` (impossible à détecter sans contexte)

## Architecture du pipeline V1

`generateRationalInequalitySteps(ineq, opts)` :

```
1. Validation operator (rejet '=')   → PedagogicalInequalityError
2. Détection variable
3. canonForm = canon(subtract(left, right))
4. denoms = collectDenominators(canonForm, variable)
   - vide ⇒ throw (appelé sur du non-rationnel)
5. extractRationalForm(canonForm) → { numerator, denominator } | null
   - null ⇒ throw InequalityNotSolvable (multi-fraction)
6. Validation :
   - degP, degQ ∈ {0, 1, 2}
   - tous coefficients constants (rejet paramétrique)
   - Q non identique à zéro
7. Calculs internes :
   - numeratorRoots = findPolynomialZeros(numerator, variable, degP)
   - denominatorZeros = findPolynomialZeros(denominator, variable, degQ)
8. Émission des étapes (6 étapes dans le cas standard) :
   a. identify-equation (kind = 'rational')           ─ « Inéquation rationnelle »
   b. identify-rational                                ─ « On a P(x)/Q(x) avec P=…, Q=… »
   c. rational-domain-restriction                      ─ « D = ℝ \ {z₁, z₂, …} »
   d. rational-locate-roots                            ─ « racines de P : … ; zéros de Q : … »
   e. rational-sign-table                              ─ tableau combiné 4 lignes
   f. inequality-conclude-rational                     ─ « S = … »
9. renumberSteps + return
```

## Op kinds (5 nouvelles)

```ts
| { readonly kind: 'identify-rational';
    readonly numerator: MathNode;
    readonly denominator: MathNode; }
| { readonly kind: 'rational-domain-restriction';
    readonly excluded: readonly MathNode[];
    readonly variable: string; }
| { readonly kind: 'rational-locate-roots';
    readonly numeratorRoots: readonly MathNode[];
    readonly denominatorZeros: readonly MathNode[]; }
| { readonly kind: 'rational-sign-table';
    readonly numerator: MathNode;
    readonly denominator: MathNode;
    readonly numeratorRoots: readonly MathNode[];
    readonly denominatorZeros: readonly MathNode[];
    readonly leadingCoefP: MathNode;
    readonly leadingCoefQ: MathNode;
    readonly variable: string; }
| { readonly kind: 'inequality-conclude-rational';
    readonly relation: '<' | '>' | '<=' | '>=' | '!=';
    readonly solutionDescription: string; }
```

## Renderer 4-row sign table

```latex
\begin{array}{|c|cccccccc|}
\hline
x        & -\infty & & r_1 & & z_1 & & r_2 & & +\infty \\
\hline
P(x)     &   & + & 0  & + & .  & + & 0   & + &        \\
\hline
Q(x)     &   & - & .  & - & 0  & + & .   & + &        \\
\hline
\dfrac{P(x)}{Q(x)} & & - & 0 & - & || & + & 0 & + &  \\
\hline
\end{array}
```

Le renderer :

1. Fusionne les points critiques `numeratorRoots ∪ denominatorZeros`, triés par valeur numérique
2. Calcule pour chaque ligne le signe à `−∞` (depuis `leadingCoefP` ou `leadingCoefQ`) et flippe à chaque croisement de racine de cette ligne
3. Insère `0` aux colonnes des racines de `P` (pour la ligne P et la ligne quotient)
4. Insère `0` aux colonnes des zéros de `Q` (pour la ligne Q seulement)
5. Insère `||` aux colonnes des zéros de `Q` (pour la ligne quotient — valeur indéfinie)

## Niveaux scolaires

- **`lycee`** : titres complets, explications détaillées, sign table avec ligne `\dfrac{P(x)}{Q(x)}`
- **`superieur`** : titres compacts, explications one-liner
- `bumpForRational(level)` : `primaire | college` → `lycee` (les fractions rationnelles ne sont pas au programme avant 1ère)

## Vérifications

- [ ] 14 comportements testés dans `__tests__/rational-inequality.test.ts`
- [ ] Renderer V2 testé dans `__tests__/rational-renderer.test.ts` (~10 tests)
- [ ] 0 régression sur palier 2a/2b/2c (331 → ~370+ tests pedagogical-solve)
- [ ] 0 régression mathAST (12707 → ~12745+)
- [ ] 2 fixtures Mode B + 2 snapshot tests (12 → 14)
- [ ] CLI demo produit le tableau combiné lisible en terminal
- [ ] Page debug `/dashboard/admin/debug/correction-mode-b` montre les 6 cards

## Décisions verrouillées

| Q                     | Décision                                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Détection rationnelle | `collectDenominators(canon, variable)` non-vide ET canonical = single division. Sinon multi-fraction → throw V1.                   |
| Sub-pipelines P/Q     | Summarisé en V1. Les racines/zéros sont calculés silencieusement (via `solve`), une seule étape `rational-locate-roots` les liste. |
| Renderer              | Étendre `QuadraticEquationRenderer` (polyvalent comme palier 2b/2c).                                                               |
| Conclude kind         | Séparé : `inequality-conclude-rational`. Coût ~10 lignes dupliquées, gain : noms cohérents.                                        |
| Niveaux               | `lycee` + `superieur` uniquement.                                                                                                  |
| Mode B                | Cohérent palier 2b/2c : nouveau discriminator `rational-inequality`.                                                               |
