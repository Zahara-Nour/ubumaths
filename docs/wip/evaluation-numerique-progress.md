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

### Question ouverte

- **(A)** une valeur de l'Atelier est toujours remplacée, même avec une lettre libre (`x + a → x + 3`, `f(x)+a → x² + 3`), puis `tidy` — recommandation, par cohérence avec les commandes ;
- **(B)** remplacée seulement si tout se calcule (l'actuel).

## Historique

- 2026-10-27 : chantier ouvert sur décision de David, worktree créé depuis `origin/main` (`1623ff3be`).
