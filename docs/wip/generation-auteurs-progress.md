# Défauts du moteur de génération gênants pour les auteurs — progression

Branche `fix/generation-auteurs` (worktree `ubumaths-wt-g2-generation`), ouverte le 2026-10-03.

## Défauts

| #   | Défaut                                                                 | État    |
| --- | ---------------------------------------------------------------------- | ------- |
| 1   | condition `a<-1` lue comme une flèche (`<-`)                           | corrigé |
| 2   | `{{if:…}}` dans `expectedAnswer` / une variable, imbriqué              | corrigé |
| 3   | variable calculée (`T/g`) substituée sans parenthèses                  | corrigé |
| 4   | raccourci `{{b;();d}}` refuse plusieurs modificateurs                  | corrigé |
| 5   | faute d'auteur dans une variable : 101 tirages avant l'erreur          | corrigé |
| 6   | `cleanCoefficients` : étapes générées, `\leqslant` en réponse, `(x+0)` | corrigé |
| 7   | série d'automatismes : `genericFunctions` coupées au-delà de 10        | corrigé |
| 8   | motifs `requiredForm` lus sans les fonctions du modèle                 | corrigé |

## Mesure de non-régression (prod, lecture seule)

Copie de `question_templates` (815 modèles) ; 12 tirages par variation (graines 0..11), modèle
réduit à une variation pour couvrir chacune ; `test_specs` rejouées. AVANT (dépôt principal sur
`main`, `d36782c59`) : 29 808 tirages, 0 échec, 7 561 specs vertes sur 7 561.

APRÈS (branche, toutes corrections) : 29 808 tirages, 0 échec, sorties IDENTIQUES à l'octet (hors
`generatedAt`), 7 561 specs vertes sur 7 561. Sensibilité vérifiée par un modèle témoin
(`N = T/2` : `11*11-3/2` avant, `(11*11-3)/2` après). Aucun modèle en prod n'emploie les
écritures corrigées (0 `{{if:` dans une variable ou une réponse attendue, 0 condition `<-`,
0 `{{b;…;…}}`, 0 `genericFunctions`) ; aucune parenthèse `(x)` dans les 44 modèles à
`cleanCoefficients` sur ces tirages.

Tests : `src/lib/questions/generator/__tests__/generation-auteurs.test.ts` (38 rouges avant, + 1
dans `serie-automatismes.test.ts`), 59 + 19 verts après.

## Décisions de comportement

- 3 : parenthèses seulement hors markdown (variables, réponses attendues) et seulement pour une
  valeur dont l'opération principale est une somme/différence (niveau 1) ou un produit/quotient
  (niveau 2), selon le caractère voisin. Une valeur négative (`-3`) n'est PAS touchée
  (`a^2` avec a = −3 donne toujours `-3^2` hors `eval` : point ouvert).
- 5 : faute d'auteur = analyse du calcul en échec, « Unknown function », « free variables »,
  variable non déclarée, `{{if:…}}` non tranchable. Le reste est relancé.
- 6c : parenthèse retirée si son contenu nettoyé est une lettre ou un nombre ; gardée après une
  lettre ou une fonction (`C(x)`) et pour un nombre en facteur non premier (`2(3)`).
- 7 : union sans plafond (la liste d'un exercice n'en a pas). Portée d'une lettre déclarée :
  tout l'exercice (inchangé, documenté).

`pnpm question:specs --file` sur les 209 `scripts/questions/**/*.json` : sortie identique à
l'octet avant (`main`) / après, 209 « importable ». `check:incremental` : 0 erreur.
