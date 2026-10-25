---
couvre:
  - 'src/lib/mathAST/reciprocal/**'
---

# La réciproque calculée (`reciprocal/`)

> Moteur : `src/lib/mathAST/reciprocal/` ([README.md](README.md)). Chantier :
> [atelier-reciproque-phase0.md](../../archive/wip/atelier-reciproque-phase0.md) (décisions R1-R4, Q5).
> Lot 2, livré sans l'atelier. La commande `.réciproque f [sur I]` et la carte `f⁻¹` (lot 3) :
> [atelier.md](../atelier.md) § « La réciproque ».

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

| Refus           | Quand                                                                                                        | Message                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| `constant`      | f ne contient pas sa variable, ou vaut la même chose partout (`3x − 3x + 2`)                                 | « Une fonction constante n'a pas de réciproque. »              |
| `not-bijective` | deux x de I ont la même image (solveur, variations, ou f périodique sur I)                                   | voir ci-dessous                                                |
| `unsolved`      | le solveur ne sait pas (`x eˣ`, `x + sin x`, `sin x`), plusieurs lettres, deux lectures de f(I) en désaccord | « Je ne sais pas calculer la réciproque de f algébriquement. » |

`not-bijective` EXPLIQUE, puis LISTE les réciproques par morceau de stricte monotonie (décision de
David du 2026-10-13). Pour x² sur ℝ :

> f n'est pas bijective sur ℝ : f(-1) = f(1) = 1, donc 1 aurait deux antécédents et f⁻¹(1) ne
> saurait pas lequel choisir. Mais f est bijective sur chacun de ces intervalles, avec une
> réciproque différente : sur ]-∞ ; 0] : $f^{-1}\left( x \right) = -\sqrt{x}$ ; sur [0 ; +∞[ :
> $f^{-1}\left( x \right) = \sqrt{x}$. Choisis un intervalle, par exemple .réciproque f sur [0 ; +∞[.

- **La paire** : deux ENTIERS de même image (échantillons du solveur, sinon valeurs rondes) ; image
  entière → « donc 1 aurait deux antécédents » ; image non entière (cos : f(-1) = f(1)) → « cette
  image » ; pas de paire (x/(x² + 1), sin) → « deux nombres différents ont la même image ».
- **Les morceaux** (`pieces`, au plus `MAX_LISTED_PIECES` = 4) : chacun recalculé par
  `computeReciprocal` sur le morceau (sans relister) ; formule en `$…$` (convention des étapes,
  rendue par ubumark), ou « (formule que je ne sais pas calculer) » et `expression: null`
  (x³ − 3x : Cardano). Au-delà de 4 (x⁵ − 5x³ + 4x : 5), ils sont comptés, pas listés.
- **Famille périodique** (`infinitelyManyPieces`, x·sin x compris) : quand le solveur ne résout pas `y = f(x)`, la période se
  lit sur `f(x₀) = f(x)` à second membre exact (`0 = sin x`) et se vérifie numériquement dans I
  (x₀ et x₀ + T dans I). Aucun morceau listé ; l'intervalle proposé est le morceau de
  [−T/2 ; T/2] qui contient 0 (sin : [-π/2 ; π/2]), sinon celui qui part de 0 (cos : [0 ; π]).
  ⚠️ `.réciproque sin sur [-π/2 ; π/2]` reste `unsolved` (pas d'arcsin) : quand la réciproque
  n'est pas calculable sur le morceau proposé, le refus ne propose PAS de commande (décision (5)
  de David, 2026-10-13, `refusePeriodicWithoutFormula`) : « f n'est pas bijective sur ℝ : f(0) =
  f(π) = 0, donc 0 aurait plusieurs antécédents. Elle l'est sur une infinité d'intervalles, par
  exemple [−π/2 ; π/2]. Sa réciproque y est la fonction arcsin, que Chiphre ne sait pas encore
  calculer. » — l'explication d'abord, comme pour x² (`periodicWhy` : 0 et π, sinon 0 et 2π, dans
  I et de même image entière — cos : f(0) = f(2π) = 1 ; tan : f(0) = f(π) = 0 ; sans paire, la
  phrase d'avant, « …sur ℝ, mais elle l'est… »). « s'écrit avec la fonction arcsin » quand x
  n'apparaît que dans sin (2 sin x + 1), une phrase sans arcsin sinon (x·sin x). tan (ensemble
  `periodic_exclusion`, `refuseTangent`) : f(x₀ + π) = f(x₀) prouve la non-bijectivité, morceau
  ]−π/2 ; π/2[ proposé s'il est monotone, arctan.
- **Variations sans solveur** : f prouvée non injective par les variations alors que le solveur
  échoue → `not-bijective` quand même (x⁴ − 2x², x eˣ sur ℝ ; avant : `unsolved`).
- `suggestion` : le morceau le plus à droite qui a une formule, sinon le dernier ; jamais une borne
  approchée par les variations (7 chiffres ou plus : « choisis un intervalle où f est strictement
  monotone ») ; une telle borne fait aussi compter les morceaux au lieu de les lister (x⁵ − 5x³).
  Aucun morceau listé n'a de formule et la commande proposée échouerait (décision (5), étendue
  le 2026-10-19) : f périodique → le refus périodique (`tan` sur ]−1 ; 4[ : « Sa réciproque y est
  la fonction arctan… », sans commande), sinon le conseil sans commande (`sin` sur ]−1 ; 4[, qui
  proposait « .réciproque f sur [π/2 ; 4[ »). Depuis que les variations coupent aux valeurs
  interdites, `tan` sur ]−1 ; 4[ a deux morceaux et passait par la liste.

Champs : `sameImage` (la paire entière), `suggestion`, `pieces`
(`{ interval, expression | null, departure | null }`, pour l'affichage LaTeX de l'atelier),
`infinitelyManyPieces`.

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
5. **Écriture** (`writing.ts`), sur l'écriture finale seulement : `tidy` ; sous une racine (carrée,
   cubique, `root(u, n)`), le contenu du radicande sort — `factorPolynomial` (ADR 0024) le donne,
   `extractPerfectPower` (`normal/radical.ts`) en garde la partie parfaite (numérateur et
   dénominateur), puis `tidy` simplifie avec le dénominateur : `√(4x + 12)/2 + 2` → `√(x + 3) + 2`,
   `∛(8x − 16)` → `2∛(x − 2)`, `∛(x/8 + 2)` → `∛(x + 16)/2` ; puis une seule fraction quand tous les
   termes d'une somme ont le même dénominateur entier, à tous les niveaux : `(x − 3)/2`,
   `(ln x − 1)/2`, `ln((x + 1)/3)` ; enfin `−x/(x − 1)` → `x/(1 − x)` (logistique :
   `ln(x/(1 − x))`).
   Les ensembles s'écrivent `ℝ \ {2}` plutôt que `]−∞ ; 2[ ∪ ]2 ; +∞[` (`withRealLineWritten`).

## Étapes (R3)

Trois `RenderedStep` : `reciprocal-solve` (`y = 2 x + 3 \iff x = \dfrac{y - 3}{2}` ; l'explication
dit quelle solution on garde quand il y en a plusieurs, et la condition d'existence), puis
`reciprocal-rename` (`f^{-1}\left( x \right) = …`), puis `reciprocal-sets`
(`f^{-1} : [0 ; +\infty[ \to [0 ; +\infty[`).

## Ce qui reste à l'écriture du solveur (mesuré le 2026-10-13)

Justes, vérifiés numériquement, mais pas la forme du manuel : `1/x²` sur ]0 ; +∞[ → `√x/x` (manuel : `1/√x`) ;
`ln(x²)` sur ]0 ; +∞[ → `√(eˣ)` (manuel : `e^{x/2}`) ; `2ˣ` → `ln x / ln 2`.

## Tests

`reciprocal/__tests__/reciprocal.test.ts` : le tableau de la phase 0 (f(f⁻¹(y)) = y et
f⁻¹(f(x)) = x sur trois points chacun, ensembles, accord des deux lectures de f(I)), la lettre
choisie, les étapes, les refus ; l'écriture du manuel (chaque réécriture égale numériquement à
l'écriture d'avant, sur trois points du départ) ; les réciproques par morceau (f(f⁻¹(y)) = y sur
trois points du départ de chaque morceau).
