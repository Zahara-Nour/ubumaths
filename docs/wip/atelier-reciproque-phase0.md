---
title: Atelier — la réciproque calculée (phase 0)
date: 2026-10-13
status: phase 0 validée (2026-10-13) ; Q5 = (b), chantier « carte sur un intervalle » avant le lot 3
---

# Atelier — la réciproque calculée

Décision de David (2026-10-13) : on ne reprend pas `.inv` de `/cas` (réciproque donnée à la main,
jamais vérifiée) ; on garde l'idée d'une **vraie réciproque, calculée algébriquement par le moteur**.
Contexte : [atelier-cas-phase0.md](atelier-cas-phase0.md). Chapeau : [atelier-progress.md](atelier-progress.md).

## Décisions de David (2026-10-13, « tes recos pour les 4 questions »)

- **R1 — Accès** : comme Dériver. Bouton « Réciproque » sur la carte de f → carte `f⁻¹` + ligne dans
  Calcul, sans changer de vue ; et la commande `.réciproque f`.
- **R2 — f non bijective** (`x²` sur ℝ) : refus expliqué en français, qui propose l'écriture avec un
  intervalle : `.réciproque f sur [0;+∞[`. Pas de « deux branches ».
- **R3 — Étapes** : affichées, comme `.résoudre` : `y = 2x + 3 ⇔ x = (y − 3)/2`, donc
  `f⁻¹(x) = (x − 3)/2`.
- **R4 — Ensembles** : la ligne dit de quel ensemble à quel ensemble : `f⁻¹ : ]0 ; +∞[ → ℝ`.

## Q5 — tranchée (b) : quand la formule de f⁻¹ vaut sur plus large que son ensemble

`f(x) = √(x+2)` donne `f⁻¹(x) = x² − 2`, **mais seulement sur [0 ; +∞[**. Une carte de fonction ne
porte aucun intervalle (`FunctionObject`, `atelier/types.ts`) : la carte `f⁻¹` serait tracée sur tout
ℝ, une parabole entière au lieu d'une demi-parabole. Faux à l'écran. Trois choix :

- **(a)** Ligne dans Calcul seulement, **sans carte**, dans ce cas-là (et carte quand les ensembles
  coïncident : affines, homographiques, `eˣ`/`ln`, `x³`). Simple, mais deux comportements.
- **(b)** Apprendre aux cartes de fonction à porter un intervalle (`f(x) = x² − 2 sur [0;+∞[`), tracé
  et calculs compris. Utile bien au-delà de la réciproque (fonctions définies sur un intervalle, partout
  au lycée), mais c'est un chantier à part, à faire AVANT.
- **(c)** Carte toujours créée, tracée sur tout ℝ, avec l'ensemble écrit sur la ligne. Rejeté d'avance :
  la courbe est fausse.

**Décision de David (2026-10-13) : (b)** — « mathAST gère les domaines ». Les cartes de fonction
apprendront à porter un intervalle (chantier à part, sa propre phase 0, AVANT le lot 3) ; la carte
`f⁻¹` est alors toujours créée, avec son ensemble.

## Comportements attendus (TDD)

### Cas nominaux

| f                  | Intervalle | Attendu                                                               |
| ------------------ | ---------- | --------------------------------------------------------------------- |
| `2x + 3`           | —          | `f⁻¹(x) = (x − 3)/2`, `ℝ → ℝ`, carte `f⁻¹`                            |
| `(2x + 1)/(x − 3)` | —          | `f⁻¹(x) = (3x + 1)/(x − 2)`, `ℝ \ {2} → ℝ \ {3}`                      |
| `x³`               | —          | `f⁻¹(x) = ∛x`, `ℝ → ℝ`                                                |
| `e^{2x+1}`         | —          | `f⁻¹(x) = (ln x − 1)/2`, `]0 ; +∞[ → ℝ`                               |
| `ln(x − 1)`        | —          | `f⁻¹(x) = eˣ + 1`, `ℝ → ]1 ; +∞[`                                     |
| `x²`               | `[0;+∞[`   | `f⁻¹(x) = √x`, `[0 ; +∞[ → [0 ; +∞[`                                  |
| `x²`               | `]−∞;0]`   | `f⁻¹(x) = −√x`, `[0 ; +∞[ → ]−∞ ; 0]`                                 |
| `√(x + 2)`         | —          | `f⁻¹(x) = x² − 2`, `[0 ; +∞[ → [−2 ; +∞[` — carte sur `[0 ; +∞[` (Q5) |

Les étapes (R3) écrivent `y = f(x) ⇔ x = …` puis le renommage en x. L'écriture finale passe par la
mise au propre habituelle de Calcul (ordre de David, virgule décimale).

### Cas limites

- **Une carte `f⁻¹` existe déjà** : elle est mise à jour, pas doublée (comme `f′`).
- **f modifiée** : la carte `f⁻¹` suit, ou disparaît avec un message si f n'est plus bijective
  (même règle que `f′` qui suit f).
- **Intervalle où f n'est pas bijective** (`x²` sur `[−1 ; 2]`) : refus R2.
- **Lettre choisie** (`f(t) = 2t + 3`) : `f⁻¹(t) = (t − 3)/2`, comme les autres cartes.

### Refus (en français, sans écriture interne)

- **f non bijective** sur son ensemble : « `f` n'est pas bijective sur ℝ (`f(−1) = f(1)`) : choisis un
  intervalle, par exemple `.réciproque f sur [0;+∞[`. » — avec deux valeurs qui ont la même image
  quand le moteur en trouve.
- **Le moteur ne sait pas résoudre** `y = f(x)` (`x eˣ`, `x + sin x`) : « Je ne sais pas calculer la
  réciproque de f algébriquement. » Jamais une réponse approchée, jamais « pas de solution ».
- **f est constante** : « Une fonction constante n'a pas de réciproque. »
- **Pas une fonction** (`.réciproque a`, liste, suite) : refus qui nomme le type.

## Lots

1. **Solveur (mathAST)** — `solve(y = f(x), x)` répond aujourd'hui **« pas de solution »** (faux) dès
   que le second membre est une lettre, pour `e^{2x+1}`, `ln(x − 1)`, `√(x + 2)`, `2ˣ`, `3eˣ − 1`
   (mesuré le 2026-10-13) ; il sait `e^x = 3`. Le corriger, avec la condition sur le paramètre
   (`y > 0`). Vérifier au passage `.résoudre e^(2x+1)=a` dans Calcul. PR à part.
2. **Le calcul de la réciproque** — résolution, choix de la branche dans l'intervalle, bijectivité,
   ensembles de départ et d'arrivée, étapes ; refus. Testé sans l'atelier.
3. **L'atelier** — bouton, commande `.réciproque f [sur I]`, carte `f⁻¹` portant son ensemble (Q5), aide — après le chantier « carte sur un intervalle ».

## Journal

- 2026-10-13 — phase 0 écrite ; R1-R4 tranchées ; Q5 = (b) ; phase 0 validée (« ok pour la phase 0 »).
