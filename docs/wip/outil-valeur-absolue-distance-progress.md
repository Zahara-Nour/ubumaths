---
title: Lot d'outils valeur-absolue-distance (n° 79)
date: 2026-11-28
status: phase 0 posée, en attente de David
---

# Lot `valeur-absolue-distance`

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : outil n° 79 vérifié manquant ; phase 0 écrite ci-dessous, rien de codé.
- **Prochaine action** : réponse de David à la phase 0, puis tests rouges dans `src/lib/mathAST/__tests__/`.
- **En attente de David** : phase 0 (§ Phase 0, questions 1 et 2).
- **Pièges en cours** : lot mathAST (un seul à la fois, règle 1 d'`outils-lots.md`).
- **Worktree / branche** : `../ubumaths-wt-outil-valeur-absolue-distance` · `feat/outil-valeur-absolue-distance`.

## Outil n° 79 : |a − b| = |b − a| dans l'équivalence

Origine : revue du lot « nombres et calculs » de Seconde, passe 2 (`idees-format-progress.md`
§ Passe 2 tranchée) ; la fiche `a-05-2` (distance écrite avec une valeur absolue) l'attend.

### Mesure du 2026-11-28 (sonde vitest, `parseLatex` + `areEquivalent`)

| Élève            | Attendu     | Verdict actuel |
| ---------------- | ----------- | -------------- |
| `\|3-x\|`        | `\|x-3\|`   | faux           |
| `\|a-b\|`        | `\|b-a\|`   | faux           |
| `\|\pi-x\|`      | `\|x-\pi\|` | faux           |
| `\|1-x^2\|`      | `\|x^2-1\|` | faux           |
| `\|-x-1\|`       | `\|x+1\|`   | vrai           |
| `\|-x\|`         | `\|x\|`     | vrai           |
| `\|5-(-2)\|`     | `\|-2-5\|`  | vrai (nombres) |
| `2\|x-3\|`       | `\|2x-6\|`  | faux           |
| `\|x+3\|`, `x-3` | `\|x-3\|`   | faux (juste)   |

### Phase 0

Règle proposée : **la valeur absolue d'un nombre et celle de son opposé sont égales**, pour
n'importe quelle expression entre les barres (|u| = |−u|), pas seulement une différence.

- **Nominal** : « Écris la distance entre x et 3 avec une valeur absolue. » Attendu `|x − 3|`.
  L'élève tape `|3 − x|` → **accepté** (aujourd'hui refusé). Pareil pour `|π − x|`, `|1 − x²|`.
- **Limite** : aucune règle d'écriture ne change : une question qui exige une valeur absolue la
  demande toujours ; `|3 − x|` reste une valeur absolue. Les nombres (`|5 − (−2)|` = 7) étaient
  déjà justes.
- **Erreur** : `|x + 3|` (mauvais signe) et `x − 3` (barres oubliées) restent **refusés**.

Questions :

1. Règle générale |u| = |−u| (recommandée : un seul cas en plus du moteur, couvre |a − b| et
   |1 − x²|) — ou seulement les différences a − b ?
2. `2|x − 3|` pour `|2x − 6|` (un facteur sorti des barres) est refusé aussi. Aucun modèle ne le
   demande aujourd'hui : je le laisse hors du lot (recommandé), ou je l'ajoute ?
