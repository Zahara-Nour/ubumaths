# Chantier `evaluation-numerique` — une ligne de Calcul dont les lettres ont une valeur

## Reprendre ici

_Mis à jour le 2026-10-27, ouverture du chantier (rien codé)._

- **État** : worktree et journal créés ; constat mesuré (ci-dessous) ; phase 0 en cours de discussion avec David.
- **Prochaine action** : recueillir les points de David (« tout ce qui suit va toucher ce chantier »), puis rédiger la phase 0 (comportements nominal / limite / erreur) ; **attendre sa validation avant de coder**.
- **En attente de David** : question A/B (ci-dessous) et des étapes pour un calcul à lettres liées ?
- **Pièges** : ne pas confondre avec `fusion-moteurs` (ni `simplify` ni `pedagogical-simplify` en jeu) ; refaire la mesure avant de coder ; le moteur de l'Atelier EST `WebReplEngine` (`mathAST/cli/web/`), le REPL de terminal n'est qu'un outil de développeur.
- **Worktree / branche** : `../ubumaths-wt-evaluation-numerique`, `feat/evaluation-numerique`.

## Contexte

Né le 2026-10-27 dans la session `fusion-moteurs`, en expliquant ce que fait une ligne nue de l'Atelier.

### Chemin d'une ligne nue (`computeInput`, `atelier/calcul.ts`)

1. Refus en français avant tout calcul (une trentaine de cas), puis les autres sens de la ligne (définition, récurrence, courbe, conversion, mesure).
2. Réécritures : termes de suite, `f(2)` d'une fonction à paramètre (réduit par `simplify()`), degrés, dérivées (`expandInput`).
3. `engine.execute` → `WebReplEngine.executeExpression` : les objets de l'Atelier y sont liés par `syncEngine` (`atelier/engine.ts`).
   - toutes les variables liées (ou aucune) → `evaluate` exact + décimal, écrit par `exactValueToShow` ;
   - au moins une lettre libre → l'arbre rendu **intact** (`createExpressionDisplayResult`).
4. Affichage (`atelier/render.ts`) : avec lettre, `tidy` ordre gardé ; sans, `exactValueToShow`.
5. « Comment ? » : `calculationSteps` (`atelier/evaluate-steps.ts`, `pedagogical-arithmetic`), seulement sans AUCUNE lettre, sans ≈, sans unité, sans fonction autre que `sqrt`/`abs`, et si les étapes concluent la valeur du moteur.

### Constat mesuré (2026-10-27, `runInput` après `a = 3`, `b = 1/2`, `f(x) = x²`)

| Saisie    | Réponse  | Saisie     | Réponse     |
| --------- | -------- | ---------- | ----------- |
| `a+1`     | `4`      | `x + a`    | `x + a`     |
| `2a+a`    | `9`      | `a x + 2x` | `a x + 2 x` |
| `a·b`     | `3/2`    | `(x+a)^2`  | `(x+a)²`    |
| `a²+b`    | `19/2`   | `f(x)+a`   | `f(x) + a`  |
| `sqrt(a)` | `√3`     | `x+x`      | `2x`        |
| `cos(a)`  | `cos(3)` |            |             |
| `f(a)`    | `9`      |            |             |
| `a/a`     | `1`      |            |             |

- Une valeur n'est remplacée que si **tout** se calcule : `a+1 → 4`, mais `x + a` reste.
- Les commandes, elles, remplacent toujours les noms d'objets (`atelier.md`, chemin de `runCommand`, étape 5) : incohérence.
- `a+1` n'a pas de « Comment ? » : une lettre, même liée, coupe les étapes.
- Aucune décision écrite trouvée sur le cas « certaines lettres liées » ; le lot 5d (D3, simplify-carte) ne parlait que de lettres libres (`2x+3x → 5x`).

### Ligne nue numérique, sans lettre (mesuré le 2026-10-27)

Chemin : refus et réécritures de `computeInput` → `WebReplEngine.createAutoEvaluationResult` (grandeur → `computeQuantity` ; garde des résultats trop longs ; `evaluate` exact PUIS décimal ; écriture par `exactValueToShow`, qui choisit parmi la valeur, la forme normale de la saisie et la saisie, mises au propre par `tidy`) → `renderResult` → « Comment ? » par `calculationSteps` (`pedagogical-arithmetic`). Bouton ≈ / valeur exacte : `approximationFields`.

Sonde complète : 37 saisies (`2+3*4`, `1/3+1/6`, `sqrt(8)`, `cos(π/3)`, `3/0`, `sqrt(-4)`, mode décimal…). Points relevés :

- étapes pour `2+3*4`, `1/3+1/6`, `(2+3)^2`, `sqrt(8)`, `sqrt(12)+sqrt(3)` ; aucune pour `cos(π/3) → 1/2` (fonction hors collège), `(1+√2)² → 3+2√2`, `0,1+0,2` ;
- en mode décimal, `2+3*4` perd ses étapes ;
- `0/0` répond « Division par zéro » (forme indéterminée) ; `sqrt(-4)` reste `√(−4)` sans message ;
- `2<3` → « vrai ».

### Notation scientifique tapée (Q24 de simplify-carte, mesuré le 2026-10-27)

Règle : saisie ENTIÈRE de forme `a × 10ⁿ`, 1 ≤ |a| < 10, n entier ≠ 0 → gardée (`keepScientific`, Atelier seul ; `{{eval}}` calcule). Mesures : `3*10^20` gardé ; `12*10^2 → 1200`, `3*10^20+1`, `2*3*10^20`, `(3*10^20)*(2*10^5)` calculés en entier. Points relevés :

- `3*10^2` gardé `3 × 10²` (exposant petit) ;
- `2,5*10^(-3)` → `0,0025` : l'exposant négatif entre parenthèses n'est pas reconnu (`atelier.md` l. 1400 cite `1.4286*10^-7` gardé) ;
- `3×10^20` (croix tapée) → refus « Nombre « 10 » écrit après un facteur… » ;
- en mode décimal, `300000000000000000000` → `3 × 10²⁰` (règle du bouton ≈, pas Q24).

### Décision D1 — la notation scientifique tapée se calcule (David, 2026-10-27)

> « Ce n'est pas logique, on s'attend à ce que l'Atelier calcule cette valeur, sauf si le nombre obtenu est illisible à cause du trop grand nombre de chiffres. »

**Revient sur Q24 de simplify-carte** (notation tapée gardée telle quelle). Désormais : `3*10^2 → 300`, `2,5*10^(-3) → 0,0025` ; la notation scientifique n'est plus une affaire de saisie mais de **lisibilité du résultat**. Restent à trancher : le seuil d'illisibilité, et le cas d'un résultat qui n'a pas d'écriture scientifique courte exacte (`2^100`).

### Question ouverte

- **(A)** une valeur de l'Atelier est toujours remplacée, même avec une lettre libre (`x + a → x + 3`, `f(x)+a → x² + 3`), puis `tidy` — recommandation, par cohérence avec les commandes ;
- **(B)** remplacée seulement si tout se calcule (l'actuel).

## Historique

- 2026-10-27 : chantier ouvert sur décision de David, worktree créé depuis `origin/main` (`1623ff3be`).
