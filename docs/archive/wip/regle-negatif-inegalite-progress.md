# Règle négative et inégalités nettoyées — progression

Branche `fix/regle-negatif-inegalite`, worktree `ubumaths-wt-gen-ineg`.

## Défauts

1. **Règle de validation avec une variable négative** — `resolveVariablesInExpression`
   (`src/lib/questions/validation-rule-evaluator.ts`) substituait `{{p}}` sans parenthèses :
   `answer^2 + {{p}} < {{q}}*answer` avec p = −3 devenait `… + -3 …`, `{{p}}^2` valait −p².
2. **`cleanCoefficients` et `\leqslant`** — `x^2+1x\leqslant2` n'était pas nettoyé.

## Causes

1. Substitution textuelle sans parenthèses (contrairement à `substituteVariable` pour `answer`).
2. La syntaxe maison ne lit pas `\leqslant`, `\geqslant`, `\leq`, `\geq`, `\le`, `\ge`, `\neq` :
   `parseCustomSafe` échoue (« Invalid backslash sequence »), la formule est laissée en LaTeX
   d'auteur, donc jamais nettoyée. `<` et `>` étaient déjà lus et nettoyés.

## État — terminé (2026-10-03)

- [x] Tests rouges : 11 (règles) + 43 (inégalités) échouaient avant correction.
- [x] Correction 1 : `substitutedValue` — négatif ou expression entre parenthèses
      (nombre positif, décimal `2,5` et nom seul inchangés).
- [x] Correction 2 : `latexRelationsToCustom` (option active seulement, formule illisible
      en syntaxe maison) ; rien à nettoyer → texte d'auteur ; garde `keepsValue` membre à membre.
- [x] Non-régression : `src/lib/questions` + `src/lib/utils` (137 fichiers, 4960 tests),
      `src/lib/mathAST` (357 fichiers, 15889 tests) ; `question:specs` sur les 209 modèles de
      `scripts/questions` : sortie identique, 209 importables.
- [x] Prod (lecture seule) : 815 modèles, 811 avec specs, 7327 specs, 0 KO avant comme après,
      sortie identique. Décor : 5 modèles à règle `{{var}}` nue (valeurs positives), 2 avec
      `cleanCoefficients`, aucun avec une relation LaTeX.
- [x] Simulation `cleanCoefficients` (logique + géométrie repérée, 30 tirages) : 0 différence
      (les modèles excluent ±1 et 0) ; décor forcé (variables à 1, −1, 0) : seules des inégalités
      LaTeX changent (`x^2\geqslant1x` → `x^2 \geqslant x`), aucune autre formule.
- [x] Doc `docs/pratiques/fiches-exercices.md`, `check:incremental` 0 erreur, `lint:fast` OK.

## Points ouverts

- `(x+0)(x+0)\geqslant0` → `\left( x \right) \left( x \right) \geqslant 0` : parenthèses
  gardées autour d'un facteur nettoyé (comportement existant de la garde des parenthèses,
  identique pour `=`).
- La réponse attendue (`cleanCoefficientsCustom`) ne lit pas `\leqslant` (elle est en syntaxe
  maison, `<=`).
