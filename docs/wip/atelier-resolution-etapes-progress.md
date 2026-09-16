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
