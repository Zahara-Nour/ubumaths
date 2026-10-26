# Chantier `tidy-conditions` — la variante `{ result, conditions }` de `tidy`

## Reprendre ici

_Mis à jour le 2026-10-26, code écrit sur la branche (PR pas encore ouverte)._

- **État** : décisions de David (§ 2) codées : `tidyWithConditions` + `domainLoss` (mathAST), l'atelier garde le domaine partout, bouton « Simplifier pour x ≠ 0 ». Tests verts (35 208), doc à jour (ADR 0007 révisée).
- **Prochaine action** : typecheck, revue (`code-reviewer` Opus), PR, CI, merge.
- **En attente de David** : essayer sur http://localhost:5177/atelier (serveur de la branche).
- **Pièges en cours** : `1/(1/x) → x` reste un bug de `tidy`, rattrapé par l'atelier seulement ; `{{eval}}` des exercices n'est pas touché (simplify() du moteur inchangé).
- **Worktree / branche** : `../ubumaths-wt-tidy-conditions` · `feat/tidy-conditions`.

## 1. Phase 0 (2026-10-26)

### Sonde (Atelier, `runInput`, test jetable supprimé)

| ligne tapée                         | réponse affichée | étapes                                                                               |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `.simplifier x/x`                   | `1`              | « On simplifie par le facteur commun, pour x ≠ 0 »                                   |
| `.simplifier (x^2-1)/(x+1)`         | `x − 1`          | factorisation, puis « … pour x ≠ −1 »                                                |
| `.simplifier ln(x)-ln(x)`           | `0`              | **aucune** (repli sur le moteur) : la condition x > 0 n'est dite nulle part          |
| `.simplifier \frac{e^{2x}x}{e^x x}` | `\frac{x eˣ}{x}` | `aᵐ/aⁿ = aᵐ⁻ⁿ` : le `x/x` reste visible                                              |
| `.développer x(1/x-1)`              | `−x + x/x`       | « On distribue x » — `tidy` (dans `pedagogical-simplify/expand.ts`) garde `x/x` (S3) |
| `.dériver x^2/x`, `x ln(x)`         | `1`, `ln(x) + 1` | justes : `options.domain` (f est définie, donc x ≠ 0)                                |

Constats :

- Les conditions des fractions de `.simplifier` existent déjà, **dans le titre de l'étape** (moteur pédagogique, `reduce-steps.ts:330`), jamais sur la ligne de réponse.
- Les trous qui viennent de `tidy` : `.développer x(1/x−1)` (`x/x` laissé au milieu d'une somme), `x eˣ/x` laissé par `.simplifier`. `ln x − ln x` passe par le repli du moteur (`simplify`), sans étape ni condition.
- Pas d'appelant dans les corrections d'exercices (aucun modèle de la prod n'utilise `generatedSteps`, sonde D4 de simplify-carte).

### Comportements proposés

Une fonction `tidyWithConditions(node, options)` → `{ result, conditions }` : elle fait ce que S3 interdit à `tidy`, et rend chaque restriction utilisée.

- **Nominal** : `x/x` → `1`, conditions `x ≠ 0` ; `x(1/x − 1)` développé → `1 − x`, `x ≠ 0` ; `ln x − ln x` → `0`, `x > 0` ; `\frac{x eˣ}{x}` → `eˣ`, `x ≠ 0`. L'Atelier écrit la ligne « `1 − x`, pour x ≠ 0 ».
- **Limite** : rien à lever → `conditions` vide, résultat identique à `tidy` (même arbre) ; condition déjà acquise (`options.domain`, `typeCtx`) → pas redite (`.dériver x²/x` reste `1`) ; deux conditions dont l'une contient l'autre → la plus forte seule (`x > 0` absorbe `x ≠ 0`) ; condition toujours vraie (`x²+1 ≠ 0`) → rien.
- **Erreur** : facteur dont on ne sait pas écrire la condition simplement → on ne simplifie pas (comportement actuel de `tidy`) plutôt que d'afficher une condition fausse ou illisible.

### Questions à David

- **Q1 — Premier appelant.** Reco : la ligne de réponse de l'Atelier pour `.développer` et `.simplifier` (seuls endroits mesurés où le `x/x` reste visible). Les corrections d'exercices hors chantier (aucun appelant en prod).
- **Q2 — Ligne de réponse de `.simplifier` sur une fraction.** Le titre d'étape dit déjà « pour x ≠ −1 », la ligne dit `x − 1`. Reco : la ligne le dit aussi, « `x − 1`, pour x ≠ −1 » (même écriture que la nouvelle variante). C'est le moteur pédagogique, pas `tidy` : à inclure dans ce chantier ?
- **Q3 — `ln x − ln x`.** Aujourd'hui `0` sans étape. Reco : « `0`, pour x > 0 », avec une étape nommée.
- **Q4 — Écriture de la condition.** Reco : « pour x ≠ 0 », « pour x > 0 », plusieurs reliées par « et » (comme les titres d'étape existants), la plus forte seule quand l'une contient l'autre.

## 2. Décisions de David (2026-10-26)

- **Toutes les commandes gardent le domaine**, comme une expression tapée et `.développer` (vérifié par sonde : `.simplifier` et `.factoriser` ne le gardaient pas). Révise la précision Q4 de l'ADR 0007 : `.simplifier (x²−1)/(x+1)` laisse la fraction.
- **Variante par ligne, au bouton** (comme « Valeur approchée »), pas un mode global.
- Q3 (« `0`, pour x > 0 ») et Q4 (« et », la plus forte seule) : recos validées.

## Historique
