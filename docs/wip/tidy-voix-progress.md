# Donner une voix à `tidy` — progression

> Branche `refactor/tidy-voix`, worktree `../ubumaths-wt-tidy-voix`.
> Spécification validée : [tidy-voix-phase0.md](tidy-voix-phase0.md) (David, 2026-09-21).
> Étape 1 du bilan du 2026-09-21 sur la fusion `simplify` / `pedagogical-simplify`.

## Pourquoi

`tidy` ne produit aucune étape — aucun `recorder` dans `src/lib/mathAST/tidy/`.
Tant qu'il est muet, l'intention `réduire` est muette et `auto` ne peut rien
raconter de sa mise au propre. C'est le verrou de tout le reste du chantier.

## Lot 1 — matérialiser entre les stages

`tidyExpression` est déjà un pipeline :

```ts
buildSum( sortTerms( chooseUnits( collectLikeTerms( toSumTerms(node) ) ) ) )
```

L'état intermédiaire est un `TidyTerm[]`, pas un AST — mais `buildSum` est
appelable à tout moment, donc on **matérialise** une expression entre deux
stages. Trois gestes sortent de là sans toucher à l'architecture, plus un
quatrième, grossier, pour le travail fait terme par terme.

| geste                     | phrase                            | d'où elle vient        |
| ------------------------- | --------------------------------- | ---------------------- |
| `tidy-terms`              | On met chaque terme au propre     | `toSumTerms`           |
| `tidy-collect-like-terms` | On regroupe les termes semblables | `collectLikeTerms`     |
| `tidy-sort-terms`         | On range par degré décroissant    | `sortTerms`            |
| `tidy-choose-unit`        | On écrit dans la même unité       | `chooseUnits`          |

⚠️ **`tidy-terms` est un ajout au périmètre validé, et il est nécessaire.**
Sans lui la chaîne ne part pas de l'entrée : `sqrt(12)+sqrt(3)` commencerait à
`2sqrt(3)+sqrt(3)`, qui tomberait du ciel. L'invariant « la chaîne part de
l'entrée » l'impose. Le lot 2 le remplacera par ses quatre gestes fins.

## État

- [x] Spécification phase 0 écrite et validée
- [x] Enregistreur `tidy/step-recorder.ts` (`TidyRule`, `TidyStep`, descriptions FR)
- [x] `tidy(node, options?)` et `tidyNode`/`tidyExpression` acceptent l'option
- [x] **Tests rouges prouvés** : 4 rouges / 63 verts. Les 4 portent sur
      l'enregistrement, les 63 sont les gardes (silence, invariants de chaîne,
      résultat inchangé) et doivent rester verts.
- [ ] Matérialisation entre les stages
- [ ] Revue `code-reviewer`
- [ ] `check:incremental` + `lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé

## Ce que le lot 1 ne fait pas

Les gestes fins du niveau du facteur — calculer les nombres, simplifier les
radicaux, regrouper les facteurs, simplifier les signes — vivent dans `toTerm`,
pendant la décomposition. C'est le lot 2.
