# Grapheur — asymptotes horizontales, obliques et courbes (feat/grapheur-asymptotes)

Demandé par David le 2026-09-15, après la correction des asymptotes verticales
(#323). Deux décisions tranchées par lui avant le code : une asymptote
unilatérale n'est tracée **que de son côté**, et les asymptotes **courbes** sont
dans le périmètre.

## Ce qui était cassé — trois causes indépendantes

1. **`estimateLimit` rejetait une convergence exacte.** Le test « les écarts
   rétrécissent » s'écrit `diff >= prevDiff * 0.9`, et `0 >= 0` est vrai. Or
   `exp(-x)` vaut 0 au flottant près dès x = -750, la sigmoïde vaut 1 dès
   x = 40 : ces fonctions n'avaient **aucune** asymptote horizontale.
2. **L'ordonnée à l'origine des obliques était condamnée.** Elle se calculait
   par `f(x) − m·x` avec un `m` estimé, dont l'erreur est multipliée par x —
   jusqu'à 100 000. Une erreur de 1e-5 sur la pente suffisait. Conséquence :
   toute oblique dont l'ordonnée à l'origine n'est pas nulle était perdue,
   `(x²+3x)/(x-2)` comme `(2x²-x+1)/(x+1)`. Les cas à ordonnée nulle passaient,
   d'où l'illusion que la détection marchait.
3. **`direction` était calculée puis ignorée au rendu.** `arctan` affichait ses
   deux horizontales sur toute la largeur, chacune traversant la moitié du
   repère où elle est fausse.

## Méthode retenue

Une seule primitive pour les trois familles : `fitPolynomialBranch()` ajuste un
polynôme de degré donné sur `degré + 1` abscisses éloignées, **par
interpolation**, puis vérifie sa **stabilité** en recommençant quatre fois plus
loin.

Deux pièges rencontrés, tous deux réglés par la mesure :

- **Comparer des coefficients exprimés dans des bases différentes.** Les
  ajustements à deux échelles s'expriment en `x/1000` et `x/4000` ; il faut
  repasser en coefficients de `x` **avant** toute comparaison.
- **Exiger que deux ajustements coïncident est irréaliste.** L'écart à
  l'asymptote est en O(1/x) : l'ordonnée à l'origine de `(x²+3x)/(x-2)` est
  estimée à 5,0167 à x = 1000 et 5,0042 à x = 4000. Une **extrapolation de
  Richardson** — `(4·loin − près)/3` — élimine le terme en 1/x et rend 4,99999.
  La stabilité se vérifie alors entre deux extrapolations successives.

⚠️ Et un piège dans ma propre vérification : le test « l'écart à l'asymptote
décroît » se sabotait lui-même. À x = 100 000, c'est l'erreur résiduelle sur le
coefficient dominant (1e-8 × x) qui domine l'écart réel, lequel **remonte**.
`x + 1/x` était rejeté pour cette raison. Le test ne sert en fait qu'à
distinguer « f _tend vers_ le polynôme » de « f **est** le polynôme » — une
parabole n'est pas asymptote d'elle-même — et se mesure donc à une échelle
modérée, où l'écart est franc.

## Périmètre

- Degré borné à **4**. Au-delà, l'extraction numérique des coefficients n'est
  plus fiable, et c'est hors programme.
- Les degrés 0 et 1 restent rendus comme horizontale et oblique : pas de doublon.
- Nouveau type `PolynomialAsymptote` (coefficients croissants), pour ne pas
  toucher à `ObliqueAsymptote`, utilisé ailleurs.
- Rendu en polyligne de 64 segments, même pointillé que les obliques ; libellé
  `y = x^2 + 3.00x + 2.00`.

## Vérification

- 13 tests (`asymptotes-limites.test.ts`) : limite atteinte exactement, deux
  paliers d'une sigmoïde, obliques à ordonnée non nulle, paraboles asymptotes,
  et les non-régressions (`1/x`, `arctan`, `√(x²+1)`, `x + 1/x`, polynômes).
- **3806** tests geometry-core + grapheur verts ; `svelte-autofixer` sans
  remarque ; rendu relu dans l'application sur les trois familles.
