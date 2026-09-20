# Les 4 bugs du relevé `simplify` — progression

> Chantier : `fix/simplify-4-bugs` — worktree `../ubumaths-wt-simplify-bugs`.
> Origine : [simplify-reecriture-releve.md](simplify-reecriture-releve.md) §6.
> Consigne de David (2026-09-20) : « Commence par corriger les 4 bugs ».

## Les 4 bugs, et où ils sont vraiment

| #   | symptôme mesuré                                                       | cause (vérifiée)                                                                                                                                                                                                           | fichier(s)                                                                                                                |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| 1   | `areEquivalent((2x)/(4y), x/(2y))` = false, idem `(-x)/(-y)` vs `x/y` | `normalFormFromFraction` réduit le pgcd **monomial** et polynomial, jamais le signe ni le contenu numérique des coefficients entre numérateur et dénominateur                                                              | `normal/normalize.ts`                                                                                                     |
| 2   | `pythagorean` ne matche jamais ; `\sin^2(x) ≢ \sin(x)^2`              | deux formes d'AST pour `sin²(x)` : `function{power}` (parseurs, `\sin^2`) et `superscript(function, 2)` ; `normalize` les hache différemment ; motifs `P.func(…, {power})` sur la 1ʳᵉ forme, `normalizePass` produit la 2ᵉ | `normal/normalize.ts` (canonicalisation), `pattern/rule-sets/trig-identities.ts` + `hyperbolic-identities.ts` (31 motifs) |
| 3   | `2sqrt(2)` lu `2·s·q·r·t·(2)` ; `sin^2(x)` lu `n²·s·x`                | **pas le tokenizer** (`parseCustom` est juste) : `detectInputFormat` envoie au parseur LaTeX — sa regex `\b(sqrt                                                                                                           | sin                                                                                                                       | …)\s\*\(`refuse un nom collé à un chiffre ou suivi de`^` | `cli/core/input-detector.ts` |
| 4   | `normalize(12[km])` = `12`                                            | `case 'unit'` de `normalizeNode` rend la forme normale de l'expression seule ; `hashMathNode` ignore aussi l'unité (`U(expr)`)                                                                                             | `normal/normalize.ts`, `normal/hash.ts`, `normal/denormalize.ts`                                                          |

## Design des correctifs

1. **Quotients** — après toutes les réductions de `normalFormFromFraction`, un
   dernier pas `normalizeQuotientCoefficients` : (a) si le coefficient du 1ᵉʳ
   terme du dénominateur est négatif, négation des deux ; (b) si tous les
   coefficients (num + dén) sont des rationnels purs, mise en forme
   **primitive** : × lcm des dénominateurs, ÷ pgcd des numérateurs → entiers
   premiers entre eux. Ne concerne que les dénominateurs non constants (les
   constants sont déjà repliés en amont).
2. **Puissance de fonction** — dans `normalizeFunction`, un nœud `function`
   avec `power` est réécrit `superscript(function sans power, power)` avant
   toute autre chose. Une seule forme normale, l'exposant porté par le
   `SymbolicFactor` (donc `sin²(x)·sin(x) → sin³(x)`). Les 31 motifs passent à
   `P.pow(P.func(…), P.num(n))`, la forme que `normalizePass` produit.
3. **Détection de format** — regex sans `\b` en tête, et `\s*[(^]` en queue.
4. **Unités** — `12[km]` → forme normale `12 · U(km)` : l'unité devient un
   facteur symbolique opaque (nœud `unit` d'expression `1`), haché **avec**
   l'unité. `denormalizeTerm` reconnaît ce facteur et reconstruit
   `unit(reste, unité^exposant)`. Conséquences voulues : `12[km] ≢ 12`,
   `12[km]+3[km] → 15[km]`, `12[km] ≢ 12[m]`, `simplify(12[km]) = 12 km`.

## Méthode

TDD strict : tests rouges d'abord (prouvés rouges), puis correctif, puis
tests ciblés du module (`pnpm test:server <chemin>`), puis
`pnpm check:incremental` **une seule fois** après tous les correctifs.

## État

- [ ] Tests rouges écrits et prouvés rouges (commit 1)
- [ ] Bug 3 corrigé (détecteur)
- [ ] Bug 2 corrigé (normalize + 31 motifs)
- [ ] Bug 1 corrigé (quotients)
- [ ] Bug 4 corrigé (unités)
- [ ] Suites `normal/`, `simplify/`, `pattern/`, `cli/` vertes
- [ ] `pnpm check:incremental` = 0 erreur, `pnpm lint:fast`
- [ ] `code-reviewer` (mathast-expert)
- [ ] PR, CI verte, merge, worktree supprimé
