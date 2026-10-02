# Pièges de la génération, 2e série — progression

Branche `fix/pieges-generation-2`, worktree `ubumaths-wt-gen`. Source : `docs/ref/fiches-exercices.md`,
section « Pièges de l'écriture d'un modèle ».

## Défauts

| #   | Défaut                                                   | État       |
| --- | -------------------------------------------------------- | ---------- |
| 1   | `%` refusé dans une condition                            | test rouge |
| 2   | `or` / `and` / `not` refusés (faux silencieux)           | test rouge |
| 3   | `sign()` inconnu de `eval`                               | test rouge |
| 4   | `pi` dans une condition n'est pas π                      | test rouge |
| 5   | `;();d` / `;d;()` : la génération échoue                 | test rouge |
| 6   | variable non définie (÷0, arccos) : le tirage échoue     | test rouge |
| 7   | variable de plusieurs lettres valant π : `round()` cassé | test rouge |
| 8   | `x_i` rendu `x_\imaginaryI`                              | test rouge |

Tests : `src/lib/questions/generator/__tests__/pieges-generation-2.test.ts`,
`src/lib/mathAST/parser/custom/__tests__/reserved-constants.test.ts` (35 rouges avant correction).

## Mesure de non-régression (prod, lecture seule)

Copie de `question_templates` (788 modèles), 30 tirages par variation (graines 0..29), modèle
réduit à une variation pour couvrir chacune. AVANT (code de `main`) : 71 760 tirages, 0 échec.

## Décisions de comportement

(remplies au fil des corrections)
