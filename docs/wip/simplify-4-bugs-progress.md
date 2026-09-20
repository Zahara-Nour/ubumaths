# Les 4 bugs du relevé `simplify` — progression

> Chantier : `fix/simplify-4-bugs` — worktree `../ubumaths-wt-simplify-bugs`.
> Origine : [simplify-reecriture-releve.md](simplify-reecriture-releve.md) §6.
> Consigne de David (2026-09-20) : « Commence par corriger les 4 bugs ».

## Les 4 bugs, et où ils étaient vraiment

### 1. `areEquivalent((2x)/(4y), x/(2y))` = false, idem `(-x)/(-y)` vs `x/y`

`normalFormFromFraction` (`normal/normalize.ts`) réduisait le pgcd **monomial**
et polynomial entre numérateur et dénominateur, jamais le **signe** ni le
**contenu numérique** des coefficients. Deux quotients égaux → deux hash.

### 2. `\sin^2(x) ≢ \sin(x)^2`, et `pythagorean` ne tirait que sur une forme

L'AST a deux formes pour `sin²(x)` : le nœud `function` avec `power` (ce que
les parseurs produisent pour `\sin^2(x)` et `sin^2(x)`) et
`superscript(function, 2)` (pour `\sin(x)^2` et `sin(x)^2`). `normalize` les
hachait différemment (`F:sin(V(x))^N(2)` contre `F:sin(V(x))^2`). Les 31
motifs `P.func(…, { power })` n'appariaient que la première forme — et
`normalizePass` produit la seconde, donc dans `simplify` la règle ne tirait
que si l'entrée était du LaTeX `\sin^2` **et** que rien ne l'avait normalisée.

⚠️ Correction du relevé : il disait « la règle est morte depuis sa naissance ».
Faux — le test existant `simplifyLatex('\\sin^2(x) + \\cos^2(x)') → '1'` est
vert depuis toujours. Elle était morte pour `\sin(x)^2` et la syntaxe maison.

### 3. `2sqrt(2)` lu `2·s·q·r·t·(2)`, `sin^2(x)` lu `n²·s·x`

**Pas le tokenizer** : `parseCustom` lit juste. C'est `detectInputFormat`
(`cli/core/input-detector.ts`) qui envoyait ces entrées au parseur LaTeX. Sa
regex exigeait une frontière de mot avant le nom de fonction (`2sqrt` n'en a
pas) et une parenthèse juste après (`sin^2(` n'en a pas).

### 4. `normalize(12[km])` = `12`

Le `case 'unit'` de `normalizeNode` rendait la forme normale de l'expression
seule, et `hashMathNode` ignorait l'unité (`U(expr)`). Donc `12[km] ≡ 12`,
`12[km] ≡ 12[m]`, et `simplify` dépouillait toute grandeur de son unité.

## Les correctifs (5 fichiers)

| fichier                      | changement                                                                                                                                                                                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cli/core/input-detector.ts` | regex sans frontière de mot en tête, `[(^]` en queue                                                                                                                                                                                                                                                                                     |
| `normal/normalize.ts`        | (2) `normalizeFunction` : `function{power}` → `superscript(function, power)` avant tout · (1) `normalizeQuotientCoefficients` : signe du 1ᵉʳ terme du dénominateur, puis coefficients entiers premiers entre eux si tout est rationnel pur · (4) `case 'unit'` : `12[km]` → `12 · U(km)`, l'unité est un facteur opaque d'expression `1` |
| `normal/hash.ts`             | (4) `hashUnit` : composants triés + coefficient, dans le hash du nœud `unit`                                                                                                                                                                                                                                                             |
| `normal/denormalize.ts`      | (4) `denormalizeTerm` retire les facteurs d'unité, dénormalise le reste, reconstruit `unit(reste, unité)` (`combineUnitFactors` : produit et puissances)                                                                                                                                                                                 |
| `pattern/match.ts`           | (2) `matchSuperscript` accepte un `function{power}`, `matchFunction` avec `power` accepte un `superscript(function, n)` — un motif `f^n` apparie les deux formes                                                                                                                                                                         |

**Pourquoi pas les 31 motifs réécrits en `P.pow`** : `pedagogical-simplify`
applique les règles trig à l'AST **brut** (phase A, avant `normalize`), et ses
tests parsent `\sin^2(x)`. Réécrire les motifs les aurait cassés. La tolérance
est dans l'appariement ; la forme normale, elle, n'en garde qu'une.

## Trouvé en chemin (hors périmètre, non corrigé)

- **`cosh²(x) − sinh²(x)` ne rend pas `1`** : la règle algébrique
  `diff-squares-symbolic` tire avant `hyperbolic-pythagorean` (qui apparie,
  mesuré) et produit `(cosh+sinh)(cosh−sinh)`, que post-normalize replie sur
  l'entrée. Pinné en `it.todo` dans `simplify/__tests__/releve-bugs.test.ts`.
- **`1 − sin²(x)` ne rend pas `cos²(x)`** dans `simplify` : `normalizePass`
  réécrit l'entrée `−sin²(x) + 1` (addition d'un opposé), et le motif
  `P.sub(1, sin²)` n'apparie qu'une soustraction. Toutes les règles `P.sub`
  ont ce problème après normalisation — à traiter dans la réécriture.

## Méthode

TDD strict : 5 fichiers de tests rouges (prouvés rouges, commit
`e9e8a3719`), puis correctifs, puis suites des modules touchés, puis
`pnpm check:incremental` une seule fois.

## État

- [x] Tests rouges écrits et prouvés rouges (commit 1)
- [x] Bug 3 corrigé (détecteur)
- [x] Bug 2 corrigé (normalize + appariement)
- [x] Bug 1 corrigé (quotients)
- [x] Bug 4 corrigé (unités)
- [x] Suites `normal/`, `simplify/`, `pattern/`, `cli/`, `pedagogical-simplify/`, `units/` : 87 fichiers, 4 237 tests verts, 0 régression
- [x] `pnpm lint:fast` : rien à signaler
- [ ] `pnpm check:incremental` = 0 erreur
- [ ] `code-reviewer` (Opus)
- [ ] PR, CI verte, merge, worktree supprimé
