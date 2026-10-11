# `P.sub` après `normalizePass` — progression

> Chantier : `fix/match-subtraction-shape` — worktree `../ubumaths-wt-match-sub`.
> Origine : [simplify-reecriture-releve.md](simplify-reecriture-releve.md) §6.6.
> Consigne de David (2026-09-20) : « corrige dans l'appariement, en petite PR séparée ».

## Le bug

`denormalizePolynomial` pose le premier terme d'une somme tel quel et n'émet une
soustraction que pour les suivants. La forme normale range la constante en
dernier, donc `1 − sin²(x)` ressort `−sin²(x) + 1`, un nœud `addition`. Et
`matchSubtraction` n'acceptait qu'un nœud `subtraction`.

Mesuré : sur les 17 règles chargées par `simplify`, 6 ont un `P.sub` en racine.
Cassées après `normalizePass` : la famille « constante moins quelque chose »
(`1 − sin²`, `1 − cos²`, `1 − tanh²`). Intactes : `f² − 1`, `f² − g²`, dont
le terme positif sort en premier.

## Le correctif (1 fichier)

`pattern/match.ts`, `matchSubtraction` : une `addition` dont un opérande est un
`opposite` s'apparie comme la différence correspondante — `−b + a` et
`a + (−b)` valent `a − b`. Même geste que la tolérance de forme de `f^n(x)`
(PR #376). Les 6 règles restent écrites en `P.sub`.

Voie écartée : mettre un terme positif en tête dans `denormalize`. C'est une
question d'écriture (§7 du relevé), et elle changerait beaucoup de sorties.

## État

- [x] Tests rouges prouvés (`pattern/__tests__/subtraction-shape.test.ts`, 5 rouges sur 9)
- [x] Correctif
- [ ] Suites `pattern/`, `simplify/`, `pedagogical-simplify/`, `normal/` vertes
- [ ] `pnpm lint:fast`, `pnpm check:incremental` = 0 erreur
- [ ] PR, CI verte, merge, worktree supprimé
