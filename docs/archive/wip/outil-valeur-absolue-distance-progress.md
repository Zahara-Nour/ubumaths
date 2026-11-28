---
title: Lot d'outils valeur-absolue-distance (n° 79)
date: 2026-11-28
status: clos (#3331, 2026-11-28)
---

# Lot `valeur-absolue-distance`

## Reprendre ici

_Mis à jour le 2026-11-28, après #3331._

- **État** : lot clos, n° 79 livré (#3331). Journal archivé.
- **Prochaine action** : aucune. **En attente de David** : rien.

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

### Tranché (David, 2026-11-28)

« Je te suis » : règle générale |u| = |−u| ; `2|x − 3|` pour `|2x − 6|` hors du lot.

### Fait

- **Équivalence** : `absOfMixedSignArgument` (`normalize.ts`, cas `abs`) oriente un argument aux
  termes des deux signes vers l'écriture sans moins en tête. Un premier essai (orientation par
  empreinte) changeait 28 rendus figés (`ln|−x + 1|`) : abandonné.
- **Écriture** : l'équivalence seule ne suffisait pas, `validateAnswer` rendait `bad_form` (« pas
  écrite sous la forme demandée ») pour `|3 − x|`. Ajout de `unifyAbsoluteOppositeAST` dans le
  pipeline de `checkForm` (`cosmetic-transforms.ts`), après le tri. Aucun autre lot en cours n'y
  touche (`fusion-moteurs` dormant, `formes-messages` ailleurs).
- **Rendu des primitives** : `∫ 1/(1 − x) = −ln|x − 1|` (avant `−ln|−x + 1|`), `∫ −3/(4 − 2x) =
3/2 ln|x − 2|`. Oracle : forme `\frac{3}{2}\ln|x-2|` ajoutée au corpus (comme `5/(2x − 4)`),
  `2/(1 − x²)` retiré des écarts de forme connus (désormais juste).
- Tests : `mathAST/__tests__/equivalence-valeur-absolue-opposee.test.ts`,
  `utils/__tests__/answer-validator-valeur-absolue-opposee.test.ts` (10 rouges sans le code).
- Doc : `convention-equivalence.md` § Valeur absolue de deux opposés.
- Revue `code-reviewer` (opus) : aucun faux accepté ; juste refusé corrigé (fraction entre les
  barres : numérateur et dénominateur orientés chacun pour soi) ; hors règle d'écriture documentés
  (coefficient `1 − √2`, `|−(x − 3)|`) ; effet sur `{{simplify:…}}` documenté.
