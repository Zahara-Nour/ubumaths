# Défauts du moteur de génération gênants pour les auteurs — progression

Branche `fix/generation-auteurs` (worktree `ubumaths-wt-g2-generation`), ouverte le 2026-10-03.

## Défauts

| #   | Défaut                                                                 | État      |
| --- | ---------------------------------------------------------------------- | --------- |
| 1   | condition `a<-1` lue comme une flèche (`<-`)                           | à faire   |
| 2   | `{{if:…}}` dans `expectedAnswer` / une variable, imbriqué              | à faire   |
| 3   | variable calculée (`T/g`) substituée sans parenthèses                  | à mesurer |
| 4   | raccourci `{{b;();d}}` refuse plusieurs modificateurs                  | à faire   |
| 5   | faute d'auteur dans une variable : 101 tirages avant l'erreur          | à faire   |
| 6   | `cleanCoefficients` : étapes générées, `\leqslant` en réponse, `(x+0)` | à faire   |
| 7   | série d'automatismes : `genericFunctions` coupées au-delà de 10        | à faire   |
| 8   | motifs `requiredForm` lus sans les fonctions du modèle                 | à faire   |

## Mesure de non-régression (prod, lecture seule)

Copie de `question_templates` (815 modèles) ; 12 tirages par variation (graines 0..11), modèle
réduit à une variation pour couvrir chacune ; `test_specs` rejouées. AVANT (dépôt principal sur
`main`, `d36782c59`) : 29 808 tirages, 0 échec, 7 561 specs vertes sur 7 561.
