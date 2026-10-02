# Pièges de rendu — progression (branche `fix/pieges-rendu`)

Source : `docs/ref/fiches-exercices.md`, « Pièges de l'écriture d'un modèle ».

| #   | Défaut                                                                               | État                                                                               |
| --- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | `{{eval:sqrt(21/25)}}` → `\dfrac{1}{5} \sqrt{21}` (bonne réponse « mauvaise forme ») | corrigé (`evaluate-with-modifiers.ts`, `schoolExactWriting`) ; mesure prod à faire |
| 2   | Typst : `\lVert … \rVert`, `\perp` en texte brut                                     | à faire                                                                            |
| 3   | Virgule décimale en dur dans une formule                                             | à examiner                                                                         |
| 4   | Réponse arrondie avec trop de décimales : « faux » sans message                      | à examiner                                                                         |

## Point 1

- Cause : `formatExact` ne passait la forme exacte par `tidy` que pour un calcul trigonométrique.
- Correction : un produit « fraction × racine » de la forme exacte est réécrit par `tidy`
  (gardé par la valeur) ; l'ordre d'une somme ne bouge pas (`1 + \sqrt{2}`).
- Test : `src/lib/questions/generator/__tests__/eval-racine-exact.test.ts` (9 rouges avant).
