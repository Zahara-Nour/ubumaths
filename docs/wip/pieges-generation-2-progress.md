# Pièges de la génération, 2e série — progression

Branche `fix/pieges-generation-2`, worktree `ubumaths-wt-gen`. Source : `docs/ref/fiches-exercices.md`,
section « Pièges de l'écriture d'un modèle ».

## Défauts

| #   | Défaut                                                   | État    |
| --- | -------------------------------------------------------- | ------- |
| 1   | `%` refusé dans une condition                            | corrigé |
| 2   | `or` / `and` / `not` refusés (faux silencieux)           | corrigé |
| 3   | `sign()` inconnu de `eval`                               | corrigé |
| 4   | `pi` dans une condition n'est pas π                      | corrigé |
| 5   | `;();d` / `;d;()` : la génération échoue                 | corrigé |
| 6   | variable non définie (÷0, arccos) : le tirage échoue     | corrigé |
| 7   | variable de plusieurs lettres valant π : `round()` cassé | corrigé |
| 8   | `x_i` rendu `x_\imaginaryI`                              | corrigé |

Tests : `src/lib/questions/generator/__tests__/pieges-generation-2.test.ts`,
`src/lib/mathAST/parser/custom/__tests__/reserved-constants.test.ts` (35 rouges avant correction, + 1 rouge ajouté pour e : voir 7 ; 36 + 6 verts après).

## Mesure de non-régression (prod, lecture seule)

Copie de `question_templates` (788 modèles), 30 tirages par variation (graines 0..29), modèle
réduit à une variation pour couvrir chacune. AVANT (worktree détaché sur `04ca079ce`, base de la
branche) : 71 760 tirages, 0 échec. APRÈS : 71 760 tirages, 0 échec, sorties IDENTIQUES à l'octet
(hors `generatedAt`). Aucun modèle en prod n'emploie les écritures corrigées (0 `x_i`, 0 `sign(`,
0 condition avec `%` / `or` / `and` / `not` / `pi`, 0 `;d;()`), 1 seul `\pi` dans un `eval`
(inchangé) : la correction ne touche que les modèles à venir.

## Causes et décisions de comportement

1. **`%`** : le parseur lit `%` comme un pourcentage (`a %` = a/100). Réécriture textuelle dans
   `condition-evaluator.ts` : `X % Y` → `mod(X, Y)`. Décision : l'opérande gauche est le PRODUIT
   qui précède (`2*a % 4` = `mod(2*a, 4)`, comme en JS/Python), l'opérande droit un seul facteur
   (`a % b * c` = `mod(a, b) * c`). Un moins unaire en tête n'est pas inclus (`-a % 3` =
   `-mod(a, 3)`) ; indifférent pour un test `!= 0`. Le parseur mathAST n'est pas touché.
2. **`and` / `or` / `not`** : lus comme des produits de lettres (o×r), condition fausse sans
   erreur. Réécrits `&&` / `||` / `!(…)`. Décision : `not` nie toute la comparaison qui suit
   jusqu'au prochain `&&` / `||` / `,` / fermant (`not a = 1` = `!(a = 1)`, comme Python), car le
   `!` du parseur se colle à l'opérande. `!a = 1` (lu `(!a) = 1`, toujours faux) devient une
   erreur explicite qui propose `!(a = 1)`. Minuscules et majuscules acceptées.
3. **`sign()`** : absent de `KNOWN_FUNCTIONS` (mathAST/eval). Ajouté, calculé sur le rationnel
   (exact autour de 0), réduit en mode exact comme `gcd`/`mod`.
4. **`pi`** : `{{eval:…}}` remplace `pi` nu par `\pi` (`BARE_PI`), pas les conditions. Même
   remplacement (regex exportée) appliqué aux conditions.
5. **`;();d`** : `parseEvalExpressionWithModifiers` ne détachait que le dernier segment `;…`. Les
   segments de modificateurs sont détachés un à un depuis la fin, et fusionnés.
6. **Variable non calculable** : `resolveVariables` lève (« Division by zero », « arccos argument
   must be in [-1, 1] ») et toute la génération échouait (1 graine sur 8 dans la repro arccos).
   Décision : la levée d'une variable = tirage rejeté, comme une condition fausse, dans la MÊME
   boucle de 100 essais (+ le premier), avec ou sans `conditions`. Message final : l'erreur de la
   dernière variable si aucun tirage n'a pu se calculer, sinon le message des conditions complété
   de la dernière erreur de variable. Une faute d'auteur déterministe (fonction inconnue) coûte
   donc 101 tirages avant de remonter, avec son message. Le flux aléatoire des tirages qui
   réussissaient déjà est inchangé (même ordre de consommation). Effet de bord voulu : l'ancien
   code rendait un échec quand le 100e nouvel essai réussissait ; plus maintenant.
7. **Variable de plusieurs lettres** : substituée en TEXTE dans le calcul (les lettres seules
   sont liées dans l'AST). Sa valeur réécrite en syntaxe maison garde `\pi` (π) ; `parseEvalAst`
   basculait alors tout le calcul en LaTeX, où `round(`, `cos(` se lisent lettre à lettre.
   Correction : si la seule commande LaTeX est `\pi`, la syntaxe maison est essayée d'abord
   (parseLatex en recours). Même famille pour e : `toCustom` écrit `\euler`, que la syntaxe
   maison ne relit pas → la valeur restait en LaTeX ; `evalResultToCustom` écrit désormais `{e}`.
8. **`x_i`** : le parseur maison (Pratt ET RD, pour la parité) lit la lettre `i` comme l'unité
   imaginaire partout. Un compteur de profondeur d'indice fait de `i` une variable dans un
   indice (`x_i`, `u_{i+1}`, `a_{ij}`) ; ailleurs (`1+i`, `x_i+i`) rien ne change. `e` en indice
   n'a pas été touché (hors périmètre).
