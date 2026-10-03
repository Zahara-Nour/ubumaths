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

## État

- [ ] Tests rouges (1 et 2)
- [ ] Correction 1 : valeur négative ou expression substituée entre parenthèses
- [ ] Correction 2 : relations LaTeX réécrites en syntaxe maison (option active seulement),
      garde de valeur membre à membre pour une relation
- [ ] Non-régression : suites questions / utils / mathAST, `question:specs`, mesures prod
- [ ] Doc `docs/ref/fiches-exercices.md`
- [ ] `check:incremental`, `lint:fast`
