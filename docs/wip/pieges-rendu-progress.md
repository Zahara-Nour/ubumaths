# Pièges de rendu — progression (branche `fix/pieges-rendu`)

Source : `docs/ref/fiches-exercices.md`, « Pièges de l'écriture d'un modèle ».

| #   | Défaut                                                                               | État                                     |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------- |
| 1   | `{{eval:sqrt(21/25)}}` → `\dfrac{1}{5} \sqrt{21}` (bonne réponse « mauvaise forme ») | corrigé, mesuré en prod                  |
| 2   | Typst : `\lVert … \rVert`, `\perp` en texte brut                                     | corrigé, compilé en conditions de prod   |
| 3   | Virgule décimale en dur dans une formule                                             | incohérence réelle, NON corrigée (David) |
| 4   | Réponse arrondie avec trop de décimales : « faux » sans message                      | message déjà là ; statut = décision      |

## Point 1

- Cause : `formatExact` (`mathAST/eval/evaluate-with-modifiers.ts`) ne passait la forme exacte
  par `tidy` que pour un calcul trigonométrique.
- Correction : `schoolExactWriting` — un produit « fraction × racine » de la forme exacte est
  réécrit par `tidy` (gardé par la valeur) ; l'ordre d'une somme ne bouge pas (`1 + \sqrt{2}`),
  `2 \sqrt{2}` et `\dfrac{1}{3} \ln(2)` inchangés.
- Test : `src/lib/questions/generator/__tests__/eval-racine-exact.test.ts` (9 rouges avant).
- Mesure (prod, lecture seule, 788 modèles × 10 tirages par variation = 23 920 instances, avant =
  `main` / après = branche) : 0 nouvel échec, 0 réponse attendue changée, 1 modèle dont une
  variable intermédiaire s'écrit autrement (`\arccos(\dfrac{\sqrt{122}}{122})`, même valeur).
  Témoin `{{eval:sqrt(21/25)}}` ajouté : détecté (la mesure voit la classe visée).
- Specs des 182 fichiers `scripts/questions/**` : 2918/2918 vertes, sortie identique avant/après.

## Point 2

- `\lVert`/`\rVert` → `\|` ; `\lvert`/`\rvert` → `|` ; `\perp` ⟂, `\parallel` ∥, `\angle` ∠,
  `\triangle` △ (Unicode : `perp` collé à `\vec` donnait « perparrow »).
- Vérifiés corrects : `\widehat`, `\overrightarrow`, `\vec`, `\cdot`, `\|`, `\in`, `\notin`, `\cup`,
  `\cap`, `\emptyset`, `\infty`, `\leqslant`, `\geqslant`, `\neq`, `\approx`.
- Échantillon compilé par `compile-prod.mjs` (fr, en) : OK, glyphes visibles.

## Point 3

- Écran (MathLive) et PDF : `0,1` nu → « 0, 1 » (espace de ponctuation) à côté de « 0,3 » ; en
  anglais « 0, 1 × 0.3 ». Corriger automatiquement est ambigu (`\{1,2,3\}`, `(x,y)`, `f(a,b)`) ;
  `0{,}1` reste une virgule en anglais par décision testée (`decimal-anglais.test.ts`). Documenté.

## Point 4

- `rounding.ts` rend déjà « Arrondis au centième. » (affiché sous la case, `blankFeedback`) ; le
  statut « incorrect » est la règle écrite en tête de `rounding.ts`. Passer en `bad_form` change la
  note : décision de David.
