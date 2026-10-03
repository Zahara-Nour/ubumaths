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

- [ ] tests rouges (générateur Typst, parseurs, résolveur) + fiche de compilation en échec
- [ ] corrections
- [ ] non-régression (suites, question:specs, mesure PDF, mesure prod)
- [ ] doc `fiches-exercices.md`, check:incremental, lint:fast
