# Dispatch des commandes REPL — un argument n'est pas forcément une expression

## Le défaut

Les deux dispatches — `mathAST/cli/web/web-repl-engine.ts` **et**
`mathAST/cli/repl.ts` — parsaient **tout l'argument** comme une expression
mathématique avant d'appeler la commande, et renvoyaient l'erreur de parse sans
jamais l'appeler.

Toute commande dont la signature met autre chose derrière l'expression mourait
donc sur ses propres arguments :

| Appel                      | Ce que le dispatch répondait          |
| -------------------------- | ------------------------------------- |
| `.taylor sin(x) 5 0`       | « Unexpected token: 5 »               |
| `.integrate x^2 x 0 1`     | « Unexpected token in expression: 0 » |
| `.solve x^2-1=0 --verbose` | « Consecutive signs not allowed: -- » |

`.taylor` était **entièrement** inutilisable : même `.taylor sin(x)` seul
échouait. Seul `equiv` bénéficiait d'une exception, écrite en dur.

## La cause racine

Le drapeau qui dit quelles commandes savent lire leurs arguments elles-mêmes
**existait déjà** : `requiresAst`, `true` par défaut dans `BaseCommand`, mis à
`false` par les quatorze commandes qui relisent `ctx.input`.

Mais il n'était **pas dans l'interface `Command`** du registre — celle que
`registry.get()` rend. Les dispatches ne pouvaient donc pas le consulter : le
renseignement était là, hors de portée de qui en avait besoin.

## Le correctif

1. `requiresAst?: boolean` entre dans le contrat `Command` (optionnel, absent =
   `true`, pour ne rien casser des implémentations existantes).
2. Les deux dispatches le consultent : quand le parse échoue et que la commande
   ne réclame pas d'arbre, elle est **appelée quand même**, avec `ast` indéfini
   et la chaîne brute dans `ctx.input`.

`ast` reste indéfini plutôt que de retomber sur `lastAst` : l'élève a fourni des
arguments, ce n'est donc pas le cas « reprends la dernière expression ».

Les commandes qui exigent un arbre (`.simplify`, `.latex`, `.tree`, `.hash`,
`.eval`, `.normal`, `.custom`) gardent leur message de parse — sans quoi elles
travailleraient en silence sur l'arbre **précédent**, et rendraient un résultat
juste à une question que l'élève n'a pas posée.

## ⛔ Une affirmation fausse que j'avais propagée

Dans la PR #339 et dans `atelier-vue-calcul-progress.md`, j'avais écrit que ces
commandes « marchent dans le CLI ». **C'était faux** : `repl.ts` a exactement le
même dispatch, donc le même défaut.

Je l'avais déduit du test unitaire de `taylor.command.ts`, qui appelle
`command.execute(ctx)` **directement** et court-circuite le dispatch — un test
vert qui ne dit rien du chemin réel. Lire les vingt lignes de `repl.ts` aurait
suffi ; je ne l'avais pas fait avant de l'affirmer, deux fois.

Les deux documents sont corrigés.

## Vérifications

- 13 tests neufs (`web-repl-arguments.test.ts`), dont 4 vus **rouges** avant le
  correctif et rouges de nouveau à la neutralisation
- 9 d'entre eux couvrent la **non-régression** : `.diff x^2`, `.diff x^2 x`,
  `.integrate x^2`, `.simplify`, `.solve` sans option, `.variations`, plus le
  refus attendu de `.simplify x^^2` et de `.taylor ^^^ 5 0`
- **1 163 tests** verts sur `mathAST/cli` et `atelier`
- `.taylor` redevient proposée dans l'atelier, avec son exemple
