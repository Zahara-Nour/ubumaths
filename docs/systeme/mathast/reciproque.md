---
couvre:
  - 'src/lib/mathAST/reciprocal/**'
---

# La réciproque calculée (`reciprocal/`)

> Moteur : `src/lib/mathAST/reciprocal/` ([README.md](README.md)). Chantier :
> [atelier-reciproque-phase0.md](../../wip/atelier-reciproque-phase0.md) (décisions R1-R4, Q5).
> Lot 2, livré sans l'atelier : la commande `.réciproque f [sur I]` et la carte `f⁻¹` sont le lot 3.

## API

```ts
computeReciprocal(f: MathNode, options?: { variable?: string; interval?: Domain; name?: string })
  : ReciprocalResult
```

- `variable` (défaut `x`) : f⁻¹ est écrite dans la même lettre (`f(t) = 2t + 3` → `(t − 3)/2`).
- `interval` : I, un `Domain` (une écriture d'élève se lit avec `parseStudentDomain`) ; sans lui,
  le domaine de f. L'arrivée de f⁻¹ est I ∩ D_f.
- `name` (défaut `f`) : le nom dans les messages et les étapes.

Succès : `expression` (f⁻¹ écrite comme au manuel), `departure` = f(I), `arrival` = I, `steps`
(`RenderedStep[]`, le format que l'atelier affiche déjà), `departureReadBy` (les chemins qui ont lu
f(I), voir plus bas). Refus (`refusal.kind`, message en français, sans écriture interne) :

| Refus           | Quand                                                                                                        | Message                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `constant`      | f ne contient pas sa variable, ou vaut la même chose partout (`3x − 3x + 2`)                                 | « Une fonction constante n'a pas de réciproque. »                                                               |
| `not-bijective` | deux x de I ont la même image                                                                                | « f n'est pas bijective sur ℝ (f(-1) = f(1)) : choisis un intervalle, par exemple .réciproque f sur [0 ; +∞[. » |
| `unsolved`      | le solveur ne sait pas (`x eˣ`, `x + sin x`, `sin x`), plusieurs lettres, deux lectures de f(I) en désaccord | « Je ne sais pas calculer la réciproque de f algébriquement. »                                                  |

`not-bijective` porte `sameImage` (deux valeurs ENTIÈRES de même image, quand on en trouve) et
`suggestion` (le dernier morceau de stricte monotonie de f sur I).

## Méthode

1. **Résoudre `y = f(x)` en x** (`solve`, second membre littéral — lot 1, #1302). Chaque solution
   porte sa condition sur y (`Solution.condition`).
2. **Choisir la branche** : pour des x₀ de I (valeurs rondes d'abord, puis réparties sur chaque
   intervalle), y₀ = f(x₀) ; la branche est la solution qui rend x₀ pour TOUS les x₀. Si une autre
   solution rend une valeur x₁ ≠ x₀ dans I, f(x₀) = f(x₁) : refus `not-bijective`, avec ces deux
   valeurs. Aucune branche ne convient → `unsolved`.
3. **Bijectivité par les variations** (`image.ts`) : `computeVariations` sur I, morceaux de stricte
   monotonie (un point critique isolé ne coupe pas un morceau qui garde son sens : x³) ; f est
   injective exactement quand les images des morceaux sont deux à deux disjointes (homographique :
   ]−∞ ; 2[ et ]2 ; +∞[). Des images qui se recouvrent → `not-bijective`.
   **f n'est acceptée que si l'injectivité est PROUVÉE** : par les variations, ou parce que le
   solveur n'a qu'une solution pour tout y. Les échantillons ne prouvent rien (`e^{x²}` sur
   ]−0,001 ; 5] leur échappait) : sans preuve → `unsolved`. Un contre-exemple de l'étape 2 doit
   avoir la même image à 1e-9 près ET s'écarter de x₀ de plus de 1e-4 (relatif) : le bruit d'une
   branche imprécise n'en est pas un (Cardano pour 1/x³ : `unsolved`, jamais `not-bijective`).
4. **f(I), deux lectures** : par les variations (réunion des images des morceaux, limites aux
   bords) et par le solveur (condition de la branche ∩ domaine de s ∩ « s(y) ∈ I », par
   `solveInequality`). Si les deux existent et diffèrent → `unsolved`. `departureReadBy` dit
   lesquelles ont abouti ; sur les huit cas du tableau de la phase 0, les deux (test).
   `computeRange` ne sert pas : il rend `null` pour (2x+1)/(x−3) et ln(x − 1) (mesuré le
   2026-10-13).
5. **Écriture** (`writing.ts`) : `tidy`, puis une seule fraction quand tous les termes d'une somme
   ont le même dénominateur entier, à tous les niveaux : `(x − 3)/2`, `(ln x − 1)/2`, `ln((x + 1)/3)`.
   Les ensembles s'écrivent `ℝ \ {2}` plutôt que `]−∞ ; 2[ ∪ ]2 ; +∞[` (`withRealLineWritten`).

## Étapes (R3)

Trois `RenderedStep` : `reciprocal-solve` (`y = 2 x + 3 \iff x = \dfrac{y - 3}{2}` ; l'explication
dit quelle solution on garde quand il y en a plusieurs, et la condition d'existence), puis
`reciprocal-rename` (`f^{-1}\left( x \right) = …`), puis `reciprocal-sets`
(`f^{-1} : [0 ; +\infty[ \to [0 ; +\infty[`).

## Ce qui reste à l'écriture du solveur (mesuré le 2026-10-13)

Justes, vérifiés numériquement, mais pas la forme du manuel : `x² − 4x + 1` sur [2 ; +∞[ →
`√(4x + 12)/2 + 2` (manuel : `2 + √(x + 3)`) ; `1/x²` sur ]0 ; +∞[ → `√x/x` (manuel : `1/√x`) ;
`ln(x²)` sur ]0 ; +∞[ → `√(eˣ)` (manuel : `e^{x/2}`) ; `2ˣ` → `ln x / ln 2`.

## Tests

`reciprocal/__tests__/reciprocal.test.ts` : le tableau de la phase 0 (f(f⁻¹(y)) = y et
f⁻¹(f(x)) = x sur trois points chacun, ensembles, accord des deux lectures de f(I)), la lettre
choisie, les étapes, les refus.
