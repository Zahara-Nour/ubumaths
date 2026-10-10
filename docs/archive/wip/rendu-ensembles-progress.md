# Rendu des ensembles et de la logique — progression

Branche `fix/rendu-ensembles`, worktree `../ubumaths-wt-rendu-ens`. Défauts relevés en rédigeant
`scripts/questions/logique-1spe/` (voir `docs/ref/fiches-exercices.md`, piège « PDF, ensembles »).

## Diagnostic (2026-10-03)

| Entrée LaTeX                                                      | Typst avant             | Cause                                                                                                                                                      |
| ----------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `\mathbb{N}\subset\mathbb{Z}`                                     | `NNsubset ZZ` (échec)   | `replaceLatexCmd` n'espace qu'après `[a-zA-Z0-9)]` : le `}` de `\mathbb{N}` (converti plus tard) et un caractère hors ASCII (`𝔻`, `ℝ`) collent l'opérateur |
| `x\in𝔻`                                                           | `x in𝔻` (échec)         | idem, après la commande                                                                                                                                    |
| `\mathbb{D}`                                                      | `"mathbb"D`             | seules R, N, Z, Q, C converties                                                                                                                            |
| `\not\subset`, `\nsubseteq`, `\not\in`, `\ni`                     | `"not" subset`…         | commandes absentes                                                                                                                                         |
| `\operatorname{Card}`                                             | `"operatorname"C a r d` | commande absente                                                                                                                                           |
| `\neg`, `\lnot`, `\wedge`, `\vee`, `\land`, `\lor`, `\complement` | texte brut              | commandes absentes                                                                                                                                         |
| `$𝔻$` (énoncé, corrigé)                                           | `$\ud835 \udd3b$`       | tokenizers custom et LaTeX de mathAST : `scanSingleChar` lit une unité de code UTF-16                                                                      |

Corrects : `\setminus`, `\emptyset`, `\varnothing`, `\Rightarrow`, `\Leftrightarrow`, `\iff`,
`\implies`, `\forall`, `\exists`, `\mathbb{N}^*`, `\overline{A}`, `A\times B`, `\{\,\}`, `ℝ`, `ℕ`.

## Étapes

- [x] tests rouges : `typst-ensembles-logique.test.ts` (9 rouges), `parser/__tests__/astral-chars.test.ts`
      (5), `content-resolver.test.ts` (1) ; fiche de toutes les notations en échec au compilateur
      de prod (`unknown variable: NNsubset`)
- [x] corrections (commit `fd5f998c0`) : `gluesBefore` / `gluesAfter` / `padSymbol` dans
      `typst-generator.ts` ; tokenizers et `latex-generator.ts` au point de code
- [x] non-régression : suites ubumark 3760, mathAST 15898, questions 3726, typst 315 vertes ;
      `question:specs --file` sur les 209 modèles : sortie identique à `main` (209 importables)
- [x] mesure PDF : 253 tirages (logique, produit scalaire, probas cond., suites), compilation prod
      OK avant/après, pages pixel-identiques (33 + 64, FR et EN)
- [x] mesure prod (lecture seule, 815 modèles × 3 tirages + 315 exercices) : 397 sorties Typst
      changées (48 modèles, 77 exercices), TOUTES uniquement par des espaces (`)dot.c` →
      `) dot.c`, `overline(A)sect` → `overline(A) sect`)
- [x] doc `fiches-exercices.md`, check:incremental 0 erreur, lint:fast propre
