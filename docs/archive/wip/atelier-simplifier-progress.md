# `.simplifier` branché sur `pedagogical-simplify`

> Chantier : `feat/atelier-simplifier` — worktree `../ubumaths-wt-simplifier`.
> Suite directe de `.résoudre` (#359…#365) et de « Dériver » (#367).

## Le défaut, mesuré

`.simplifier` passait par le `simplify()` **algorithmique** du moteur, qui
cherche un point fixe de coût et ne raconte rien. Mesuré le 2026-09-19 :

| saisie                     | ce que l'élève recevait     | ce qu'il reçoit maintenant |
| -------------------------- | --------------------------- | -------------------------- |
| `.simplifier x+x`          | `Simplified: x+x`           | `2x`                       |
| `.simplifier sqrt(8)`      | `Simplified: sqrt(8)`       | `2√2`                      |
| `.simplifier 2/6+1/4`      | `Simplified: 7/12`          | `7/12`, **avec** la règle  |
| `.simplifier (x²-1)/(x+1)` | `Simplified: (x^2-1)/(x+1)` | `x - 1`                    |

Les deux premières lignes ne sont pas un défaut d'explication : le moteur
**rendait l'entrée inchangée**. L'étape pédagogique n'est donc pas qu'un
commentaire, c'est aussi la bonne réponse — même situation que les inéquations
sur `.résoudre`.

## L'intention : `auto`, et c'est un choix

`pedagogical-simplify` **n'a pas d'intention par défaut, par construction** :
« simplifier » ne veut pas dire la même chose selon la question posée
(`factoriser` / `developper` / `reduire` / `auto`). Un élève qui tape
`.simplifier` sans rien dire de plus demande exactement ce que `auto` décrit —
réduire, et n'appliquer que les transformations non ambiguës.

Conséquence assumée : **`x² - 4` reste `x² - 4`**. Le factoriser serait
répondre à une autre question. La règle de facteur commun ajoutée en #372 vit
dans l'intention `factoriser`, donc elle n'est PAS atteignable depuis
`.simplifier` — il faudrait une commande `.factoriser`, qui n'existe ni dans
l'atelier ni dans le registre du moteur. À trancher par David.

## Ce qui a été fait

- `src/lib/atelier/simplify-steps.ts` — `simplifySteps(expression)` rend
  `{steps, answer}` ou **`null` = repli** (la ligne garde alors la sortie du
  moteur). Tout le corps est dans un `try` : une exception remonterait jusqu'à
  `desk.submit`, qui n'afficherait AUCUNE ligne.
- `runCommand` (`calcul.ts`) branche `name === 'simplify'`, sur le modèle
  exact de `.dériver`.
- **Repli des doublons** : mesuré, `3x + 2x - x` émet **deux** étapes
  `combine-like-terms` dont le rendu est identique au caractère près (le module
  colore l'expression entière et montre le résultat final, faute de savoir
  écrire l'étape intermédiaire). On replie l'identique **consécutif et de même
  règle** seulement : deux règles différentes qui rendent la même image restent
  deux étapes, parce qu'elles disent deux choses (`√12 + √3` : « on simplifie
  le radical », puis « on regroupe »).

## Défaut trouvé en chemin : les raccourcis ambigus

`resolveCommand` ne traduit que le nom **français**. Un raccourci partait donc
au moteur tel quel — et le moteur l'arbitre autrement que le catalogue que
l'élève lit. Mesuré sur le registre : **deux** raccourcis sont revendiqués par
deux commandes chacun.

| raccourci | catalogue (affiché) | moteur (exécuté) | ce que voyait l'élève |
| --------- | ------------------- | ---------------- | --------------------- |
| `.s`      | Simplifier          | `solve`          | **ligne vide**        |
| `.h`      | Aide                | `hash`           | **ligne vide**        |

Le catalogue arbitre déjà, délibérément (« `aide` est utile à un élève,
`empreinte` ne l'est pas ») — mais seulement pour l'AFFICHAGE. `runCommand`
exécute désormais le nom **canonique** du catalogue, pas ce qui a été tapé.
C'est aussi ce qui fait que `.simp` déplie ses étapes comme `.simplifier`.

Garde générale ajoutée : **aucun raccourci du catalogue ne rend une ligne
vide**, testé sur toutes les commandes qui portent un exemple. Un raccourci
ambigu ajouté demain se verra sans qu'on y pense.

## Tests

- `simplify-steps.test.ts` (serveur, 17) — le module, le repli, le chemin
  complet de la commande.
- `raccourcis-ambigus.test.ts` (serveur, 4) — l'arbitrage du catalogue.
- `simplifier-depliage.svelte.test.ts` (Chromium, 7) — MathLive compose le
  `\begin{aligned}` / `\textcolor`, et « Comment ? » déplie vraiment.

Preuves rouges faites par **neutralisation depuis une COPIE** (jamais
`git checkout`) : branchement coupé → 5 rouges serveur + 3 rouges Chromium ;
canonicalisation coupée → 4 rouges.

## Dettes notées, pas traitées

- **Étapes en doublon dans le rendu de `pedagogical-simplify`** : la cause est
  que chaque étape porte `globalBefore`/`globalAfter` (l'expression entière),
  jamais l'image intermédiaire. On la replie au bord de l'atelier ; les
  corrections de questions en production, elles, affichent toujours les
  doublons. Vrai correctif = donner aux étapes un avant/après LOCAL.
- **`auto` développe `(x+1)²`** en `x² + 2x + 1` (règle `expand-power`), alors
  que la doc du module présente `auto` comme « réduire + transformations non
  ambiguës ». Développer un carré n'est pas évident ; à revoir côté module.
- **Pas de commande `.factoriser` / `.développer`** : les intentions
  `factoriser` et `developper` sont inatteignables depuis l'atelier.
