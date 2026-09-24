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
buildSum(sortTerms(chooseUnits(collectLikeTerms(toSumTerms(node)))));
```

L'état intermédiaire est un `TidyTerm[]`, pas un AST — mais `buildSum` est
appelable à tout moment, donc on **matérialise** une expression entre deux
stages. Trois gestes sortent de là sans toucher à l'architecture, plus un
quatrième, grossier, pour le travail fait terme par terme.

| geste                     | phrase                            | d'où elle vient    |
| ------------------------- | --------------------------------- | ------------------ |
| `tidy-terms`              | On met chaque terme au propre     | `toSumTerms`       |
| `tidy-collect-like-terms` | On regroupe les termes semblables | `collectLikeTerms` |
| `tidy-sort-terms`         | On range par degré décroissant    | `sortTerms`        |
| `tidy-choose-unit`        | On écrit dans la même unité       | `chooseUnits`      |

⚠️ **`tidy-terms` est un ajout au périmètre validé, et il est nécessaire.**
Sans lui la chaîne ne part pas de l'entrée : `sqrt(12)+sqrt(3)` commencerait à
`2sqrt(3)+sqrt(3)`, qui tomberait du ciel. L'invariant « la chaîne part de
l'entrée » l'impose. Le lot 2 le remplacera par ses quatre gestes fins.

## Décisions de David (2026-09-21)

- **Une relation se raconte ENTIÈRE** : l'élève voit `3x+2x=5 → 5x=5`, jamais
  `3x+2x → 5x` tout seul. Chaque membre est mis au propre avec son propre
  enregistreur, puis ses étapes sont rejouées sur la relation complète.
- **La phrase des unités est « On choisit l'unité adaptée »** — et non « on
  écrit dans la même unité », faux sur un terme seul (`3600 s → 1 h` n'a aucune
  unité à partager).

## Ce que la revue a trouvé, et ce qui l'a corrigé

Six défauts, tous reproduits avant correction. Ils avaient deux causes.

**La narration inventait des écritures que le chemin muet ne construit jamais** —
parce que les frontières des stages ne sont pas celles d'un geste d'élève :

| entrée          | on montrait              | on montre           |
| --------------- | ------------------------ | ------------------- |
| `0,005 m`       | `(1/200) m` puis `5 mm`  | `5 mm`, un geste    |
| `12 km + 500 m` | `12500 m` puis `12,5 km` | `12,5 km`, un geste |
| `x × 0`         | `0x` puis `0`            | `0`, un geste       |

Correctif : `materialise()` passe **toujours** par `chooseUnits` (c'est lui qui
pose le drapeau décimal, `collect.ts:783`) et **jette les coefficients nuls**
(c'est `collectLikeTerms` qui le fait dans le chemin muet). Et le geste est
nommé `tidy-choose-unit` dès que l'**ensemble des écritures d'unité** change,
quel que soit le stage : `km|m → km` est une conversion, `km → km` un
regroupement.

**La narration se taisait là où le résultat changeait** : `3x+2x=5 → 5x=5` et
`30 °C − 20 °C → 10 K` ne produisaient aucune étape, et `(3x+2x)` commençait à
`3x+2x` parce que `stripUnnecessaryBrackets` passe avant. Correctif : les
options descendent dans les relations et les sorties anticipées de température,
et `tidy` transmet l'expression **telle que l'élève l'a écrite**.

⚠️ **Et mon test d'invariant ne pouvait structurellement pas voir ces trois-là** :
il contenait `if (etapes.length === 0) return;`, donc toute entrée muette
sortait par le haut — exactement leur forme. Le `PANEL` n'avait ni grandeur, ni
relation, ni parenthèse superflue, ni terme annulé. Encore une empreinte qui ne
contenait pas la classe visée. L'échappatoire est retirée : le silence doit
vouloir dire « rien n'a bougé », vérifié par `nodesEqual`.

⚠️ **Un enregistreur vaut pour UN appel** : `tidy` ajoute sans vider, donc deux
appels sur la même instance mettent bout à bout deux chaînes qui ne se
recollent pas. Écrit dans la JSDoc de `TidyOptions`. À tenir en tête quand
`simplify` consommera `tidy`.

## État

- [x] Spécification phase 0 écrite et validée
- [x] Enregistreur `tidy/step-recorder.ts` (`TidyRule`, `TidyStep`, descriptions FR)
- [x] `tidy(node, options?)` et `tidyNode`/`tidyExpression` acceptent l'option
- [x] **Tests rouges prouvés** : 4 rouges / 63 verts. Les 4 portent sur
      l'enregistrement, les 63 sont les gardes (silence, invariants de chaîne,
      résultat inchangé) et doivent rester verts.
- [x] Matérialisation entre les stages
- [x] Revue `code-reviewer` (Opus) : 10 findings, tous traités ou tranchés
- [ ] `check:incremental` + `lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé

## Ce que le lot 1 ne fait pas

Les gestes fins du niveau du facteur — calculer les nombres, simplifier les
radicaux, regrouper les facteurs, simplifier les signes — vivent dans `toTerm`,
pendant la décomposition. C'est le lot 2.
