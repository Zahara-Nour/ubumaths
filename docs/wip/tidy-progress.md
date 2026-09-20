# `tidy()` — progression de la phase 1

> Spécification validée : [tidy-phase0.md](tidy-phase0.md) (David, 2026-09-20).
> Trois PR, dans cet ordre, pour que `main` reste cohérente à chaque merge :
>
> 1. **`feat/tidy`** (ce worktree, `../ubumaths-wt-tidy`) : le module `tidy`
>    seul, non branché. Étapes 1 à 9 du contrat, plus « l'unité survit ».
> 2. **`simplify` recâblé** sur `tidy` (§B), panel complet en tests.
> 3. **Les grandeurs** : conversion dans `normalize` (§D.1, D.2) et unité
>    adaptée à l'affichage (§D.3, étape 10 de `tidy`).
>
> Recâbler avant de convertir évite qu'entre deux merges `.simplify 12[km]`
> affiche `12000[m]`.

## PR 1 — `feat/tidy`

- Module : `src/lib/mathAST/tidy/` — `index.ts` exporte `tidy(node: MathNode): MathNode`.
- Tests : `src/lib/mathAST/tidy/__tests__/tidy.test.ts`, une `it` par ligne du
  contrat, attendus en syntaxe maison. Rouges tant que le module n'existe pas.
- Implémentation : déléguée à `mathast-expert` (Opus), les tests pour contrat,
  briques existantes imposées (`flattenSumShallow`, `flattenProductShallow`,
  `stripUnnecessaryBrackets`, `hashMathNode`, `extractRational`,
  `foldCoefficients`, `simplifyRadicals`). Interdits : `pnpm check`, `lint`,
  `build`.
- Ordre canonique (§A.8), tie-break : à degré égal, ordre alphabétique de
  l'écriture `toCustom` du terme (`2(x+h)^2-2x^2`).

## État

- [x] Tests rouges prouvés (commit `51a97ca4d`)
- [x] Module `tidy` implémenté par `mathast-expert` (Opus), 5 fichiers, 895 lignes : 118 tests verts
  - 4 cas d'abord rouges pour des raisons **hors de `tidy`**, vérifiées : `1/√2 ≢ √2/2` pour `areEquivalent` (relevé §6.8) ; `x^2/x` refusé et `x/x^2` lu `(x/x)^2` par le parseur maison (§6.9). Tests ajustés : parenthèses, et l'invariant d'équivalence exclut `1/√2` avec la raison.
  - `simplifyRadicals` ne fait que `√a·√b → √(ab)` : l'extraction `√8 → 2√2` est écrite dans `tidy/collect.ts`.
  - ⚠️ **À valider par David** : à degré égal, une somme **imbriquée** (base d'un facteur, entre parenthèses) n'est triée que par degré, ordre d'écriture conservé — `(x+h)` reste `(x+h)`, `2*(1+x)^2` reste `2(1+x)^2`. La somme de tête, elle, est alphabétique (`b+a → a+b`). Sans ça, le contrat rendrait `2(h+x)^2`.
- [ ] Revue du diff
- [ ] `pnpm check:incremental` = 0 erreur, `pnpm lint:fast`
- [ ] PR, CI verte, merge, worktree supprimé
