# `f\left( … \right)` lu comme `f(…)` — progression

Branche `fix/fonction-left-paren`, worktree `ubumaths-wt-parseur-left`. Validé par David le 2026-10-03.

## Constat

Avec les fonctions génériques par défaut (f, g, h, u, v, w, F, G, H), `parseLatex` lisait
`f(1)` comme une fonction mais `f\left(1\right)` comme le produit `f × 1`. Conséquence :
`removeFactorsOneAST(removeSignsAST(…))` changeait `f'\left(1\right)` en `f'` et
`f\left(-3\right)` en `-f 3`.

## Cause

`parseGenericFunction` (`parser/latex/parser-pratt.ts`) n'acceptait que le jeton `(` ;
`\left` retombait dans la multiplication implicite.

## Correction

`tryParseGenericFunctionArguments` : `( … )` ou `\left( … \right)` (même liste d'arguments
séparés par des virgules, même nœud). `\left[` et `\left|` ne sont pas des appels. Lettre non
déclarée et `genericFunctions: null` : inchangé. Le parseur custom n'a pas de `\left` ; le
parseur RD ne connaît pas les fonctions génériques (inchangés).

## État

- [x] Tests rouges puis verts : `src/lib/mathAST/__tests__/parser-generic-functions-left-paren.test.ts` (23 rouges → 28 verts)
- [x] Suites mathAST, questions, utils, ubumark : 607 fichiers verts
- [x] `question:specs --file` sur les 195 `scripts/questions/**/*.json` : sortie identique avant/après
- [x] Prod (lecture seule) : 801 modèles, 7075 specs, 0 verdict changé ; 5 tirages par modèle identiques ;
      38 modèles / 190 tirages contiennent `f\left(` ; `toLatex` de ces segments ne change que d'un espace
      (`f \left(` → `f\left(`), 80 segments passent de `multiplication` à `function`
- [x] `check:incremental`, `lint:fast`
