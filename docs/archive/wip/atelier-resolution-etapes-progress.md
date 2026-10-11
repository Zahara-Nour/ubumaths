# Progression — la résolution pas à pas dans l'atelier

Branche `feat/atelier-resolution-etapes`. Spécification :
[atelier-resolution-etapes-phase0.md](atelier-resolution-etapes-phase0.md).

## Ce qui est fait

|                                                   | état |
| ------------------------------------------------- | ---- |
| `src/lib/atelier/solve-steps.ts` — étapes + repli | ✅   |
| Câblage dans `runCommand` (`calcul.ts`)           | ✅   |
| `Entry.steps` et `desk.submit`                    | ✅   |
| Dépliage « Comment ? » dans `CalculView.svelte`   | ✅   |
| Tests serveur (15 + 9) · tests Chromium (5)       | ✅   |
| `lint:fast`, `eslint` ciblé, `svelte-autofixer`   | ✅   |

Décisions Q1/Q2/Q3 tranchées par David (« ok go » sur les recommandations) :
ligne + dépliage à la demande · niveau `college` remonté par mathAST ·
explications affichées.

## Les gardes, prouvées une à une

Les six tests de repli **passaient déjà avec le stub** : ils ne prouvaient rien.
Chaque garde a donc été neutralisée séparément, en restaurant depuis une
**copie** (jamais `git checkout`), pour voir quels tests mordent.

| garde neutralisée                        | tests devenus rouges                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| le `try/catch` autour de la génération   | L1 (degré 3), L2 (non polynomial), L3 (paramètre)     |
| la garde « la dernière étape conclut »   | L5 (`0x=5`, `x=x`)                                    |
| la garde « c'est une relation »          | E2 (`x^2-4`)                                          |
| le choix du renderer (les deux inversés) | N1, N1 bis, et le test « jamais titrée second degré » |

**E1 reste vert sous chaque neutralisation prise isolément** — il est couvert
deux fois (la garde `node === null` et le `catch`). C'est de la défense en
profondeur, pas un test inutile : il tombe si les deux disparaissent. Noté ici
pour que personne ne le croie plus fort qu'il n'est.

## Une mesure qui a sauvé un test creux

Le test d'affichage assertait d'abord `markup.length > 0`. Mesuré dans
Chromium : **il ne pouvait pas échouer.**

```
convertLatexToMarkup('')                  -> 79 caracteres
convertLatexToMarkup('\pasunecommande{3}') -> 279 caracteres
```

MathLive n'échoue pas : il **compose une boîte d'erreur**. Le seul signal
exploitable est la classe `ML__error` qu'il pose dessus — présente sur une
commande inconnue et sur un environnement inconnu, absente de tout ce que
produisent les renderers. Le test assert désormais ça, et vérifie d'abord que le
marqueur apparaît bien sur du LaTeX invalide, faute de quoi les trois autres
assertions ne garderaient rien.

## La revue de code — un bloquant réel, corrigé

### Le défaut signalé, et ma correction à l'envers

La revue a relevé que `.résoudre 3x+5=14 x` affichait `x = 5/11` pendant que le
moteur répondait `x = 3`, et a conclu que la ligne mentait. **J'ai corrigé dans
le mauvais sens** : j'ai reproduit le découpage du moteur pour les faire
coïncider sur `x = 3`.

**David a relevé l'erreur : `x = 5/11` est la BONNE réponse.** Il y a un `x` au
second membre — `3x+5 = 14x` donne bien 5/11.

Mesuré, le parseur lit l'espace comme une multiplication implicite :

```
3x+5=14 x   ->  3x+5=14x
3-v=1       ->  3-v=1
```

C'est **le moteur** qui se trompe, en appliquant deux conventions de terminal
qui n'ont pas leur place devant un élève :

| entrée             | moteur                                                               | juste      |
| ------------------ | -------------------------------------------------------------------- | ---------- |
| `.solve 3x+5=14 x` | `x = 3` — il ampute le `x`, le prenant pour un argument « variable » | `x = 5/11` |
| `.solve 3-v=1`     | « contradictoire » — il lit `-v` comme un drapeau et résout `3 = 1`  | `v = 2`    |

`solveSteps` lit donc l'argument **comme des mathématiques**, sans aucune
convention de ligne de commande. Les étapes **réparent** ces deux défauts au
lieu de les propager : la ligne affiche `x = 5/11` et `v = 2`, et la sortie du
moteur reste en repli, invisible tant que le LaTeX se compose.

Les deux défauts du moteur sont versés au lot de correction de mathAST
(`mathast-5-defauts-prompt.md`).

**La leçon** : un finding d'auditeur désigne un endroit juste, pas forcément le
bon coupable. Ici les deux valeurs divergeaient bien — mais c'était l'autre qui
était fausse. J'ai aligné sans vérifier laquelle des deux disait vrai.

### Les autres corrections

| finding                                                                      | correctif                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| une inéquation rendait 4 étapes titrées « Solution : x = 3 » pour `x < 3`    | la garde exige `relation === '='`, comme le moteur |
| le `try` ne couvrait que la génération, pas le rendu (les renderers jettent) | le corps entier est dans le `try`                  |
| `latex` posé même vide → zone mathématique vide, texte jamais affiché        | repli si la conclusion n'a pas de LaTeX            |
| un test réimplémentait `answerOf` au lieu de l'appeler                       | il l'appelle                                       |
| casts `as Extract<…>` masquant le `kind` réel                                | narrowing sur `result.kind`                        |
| `aria-expanded` sans `aria-controls`                                         | les deux attributs, avec l'`id` du panneau         |

### Le geste, maintenant prouvé vivant

La revue relevait que rien ne traversait le clic : deux moitiés vertes (les
étapes se calculent, le LaTeX se compose) et zéro preuve que « Comment ? »
déplie quoi que ce soit — la forme exacte de #339 et #342.

`solve-depliage.svelte.test.ts` monte désormais `CalculView` pour de bon dans
Chromium (`mount()` de Svelte 5 ; le dépôt n'a pas de testing-library et n'en a
pas eu besoin) et modélise la séquence complète `pointerdown → mousedown →
pointerup → mouseup → click`. Prouvé par neutralisation :

| neutralisation                      | tests devenus rouges                               |
| ----------------------------------- | -------------------------------------------------- |
| `toggleSteps` ne fait plus rien     | « cliquer fait apparaître », « recliquer replie »  |
| le bouton s'affiche sur toute ligne | « une commande sans étapes n'offre pas le bouton » |

## Reste à faire

- **Le bouton « Résoudre » du panneau** passe toujours par l'ancien chemin
  (`runAction` → `.solve …=0` → formateur de terminal). L'élève obtient donc
  deux réponses différentes selon qu'il tape la commande ou clique le bouton —
  exactement le défaut que `substituteNames` documente déjà (« Deux chemins,
  deux réponses »). Hors périmètre de ce lot par la Phase 0 §5 ; **à trancher
  par David** avant le lot suivant.
- **Les inéquations** : `generateInequalitySteps` existe et marche, `.résoudre`
  ne les traite pas.
- **Le défaut `2 1`** au dénominateur du second degré quand `a = 1` — il est
  dans `pedagogical-solve/quadratic-renderer.ts`, versé au lot de correction de
  mathAST (`mathast-5-defauts-prompt.md`).
- **`.résoudre 2x+1<7` affiche une ligne VIDE** — défaut préexistant : le moteur
  n'a rien pour les inéquations. C'est précisément le trou que
  `generateInequalitySteps` comblerait, et l'argument le plus fort pour le lot
  suivant.
- **`GeneratedStepsCorrection.svelte` style en `hsl(var(--primary))`** alors que
  les tokens du dépôt sont `--color-*` : ces déclarations tombent (pas de filet
  gauche, couleurs par défaut). Préexistant, gravé dans
  `scripts/css-tokens-baseline.txt`, donc invisible à la CI — mais ce lot met ce
  composant devant l'élève pour la première fois dans l'atelier.
