# Structure d'une expression — phase 0

> Chantier ouvert le 2026-10-11. Héritier d'Algebria (outil Flash/Haxe de David, Sésamath, article
> 487 de MathemaTICE). Démo : `/test-structure`, branche locale `feat/demo-structure-expression`
> (worktree `../ubumaths-wt-structure`, non poussée). Vocabulaire : [CONTEXT.md](../../CONTEXT.md)
> § « La structure d'une expression ».

## Décisions de David (2026-10-11)

| #   | Question                     | Décision                                                                                                                                                                               |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | Où                           | d'abord un **outil dédié** (page), puis l'**Atelier**. Pas dans les formules des énoncés.                                                                                              |
| Q2  | Signe « − »                  | **à l'écran, le signe appartient à la somme** (comme la démo, case « le signe − » décochée).                                                                                           |
| Q3  | Nombre, lettre seuls         | **encadrés**.                                                                                                                                                                          |
| Q4  | Sous-expressions englobantes | **en option** (réglage, décoché par défaut).                                                                                                                                           |
| Q5  | Ce qui est affiché           | une **lecture en français** : `2+3y` → « la somme de 2 et du produit de 3 par y », mots en **mots cliquables** vers le dictionnaire.                                                   |
| Q6  | Glisser-déposer              | **pas en v1** (phase 0 à part).                                                                                                                                                        |
| Q7  | Fonctions                    | **argument explorable** (`\sin(2x+1)` : `2x+1` s'encadre).                                                                                                                             |
| Q8  | Vocabulaire                  | **sous-expression** ; outil : **Structure d'une expression**.                                                                                                                          |
| Q9  | Somme mêlant `+` et `−`      | à l'écran : somme aplatie, signe à la somme. **Lecture** : somme aplatie avec ses signes, « la somme de 5, −3 et x ». Parenthéser pour les classes sans somme algébrique : à l'auteur. |
| Q10 | Où la lecture                | celle de la sous-expression survolée, celle de l'expression entière en permanence, et **en sens inverse** : survoler un mot encadre sa sous-expression.                                |
| Q11 | Formulations                 | le tableau ci-dessous.                                                                                                                                                                 |
| Q12 | Mots cliquables              | la **même fiche que dans les énoncés** (niveau de l'élève) ; définitions manquantes proposées par Claude, validées par David.                                                          |
| Q13 | Deux termes avec « − »       | « la différence de 5 et 3 » (exactement deux termes), à tous les niveaux.                                                                                                              |
| Q14 | Élève de 6e ou avant         | message si une suite **mêle `+` et `−` sur 3 termes ou plus**, ou commence par **`−`** ; structure et lecture **masquées** tant que le message est là.                                 |
| Q15 | Accès                        | page **publique** ; niveau = celui de l'élève connecté (`readReaderGrade`) ; visiteur : pas de message.                                                                                |

Programmes (points en base) : relatifs, opposé, priorités opératoires et enchaînement d'additions et
soustractions de relatifs arrivent en **5e** (5-007, 5-012, 5-013, 5-023) ; avant, calculs avec
parenthèses (CM1-049, CM2-054). D'où la frontière « 6e ou avant ».

## Spécification (validée par David le 2026-10-11)

### A. L'encadré

| #   | Cas                                        | Comportement attendu                                                                                     |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| A1  | survol d'une expression reconnue           | la plus petite sous-expression contenant le pointeur est encadrée, par-dessus ; la formule ne bouge pas. |
| A2  | `5 − 3 + x`, survol de `−`                 | la somme entière.                                                                                        |
| A3  | `5 − 3 + x`, survol de `3`                 | `3` (terme).                                                                                             |
| A4  | `2 + 3 + 4`, survol du premier `+`         | la somme entière (pas `2 + 3`).                                                                          |
| A5  | `6a`, survol entre `6` et `a`              | le produit `6a`.                                                                                         |
| A6  | `(√3 + 6a) × 2/7`, survol d'une parenthèse | `(√3 + 6a)`, parenthèses comprises.                                                                      |
| A7  | dénominateur d'une fraction                | le dénominateur (pas le quotient).                                                                       |
| A8  | `\sin(2x+1)`, survol de `2`                | `2` ; survol de « sin » : la fonction appliquée.                                                         |
| A9  | `2x + 3 = 7`, survol de `=`                | l'égalité ; survol de `7` : `7` (membre de droite).                                                      |
| A10 | réglage « sous-expressions englobantes »   | coché : toutes les sous-expressions qui contiennent le pointeur sont encadrées (extérieures en gris).    |
| A11 | tactile                                    | un toucher encadre ; un nouveau toucher dans le cadre remonte d'un cran ; l'expression entière reste.    |
| A12 | expression vide                            | rien (pas de message).                                                                                   |
| A13 | expression non reconnue ou incomplète      | « Expression non reconnue ou incomplète », pas d'encadré, pas de lecture.                                |

### B. La lecture

| #   | Écriture                  | Lecture                                                          |
| --- | ------------------------- | ---------------------------------------------------------------- |
| B1  | `2 + 3y`                  | la somme de 2 et du produit de 3 par y                           |
| B2  | `a + b + c`               | la somme de a, b et c                                            |
| B3  | `5 − 3`                   | la différence de 5 et 3                                          |
| B4  | `5 − 3 + x`               | la somme de 5, −3 et x                                           |
| B5  | `−3 + x`                  | la somme de −3 et x                                              |
| B6  | `a × b × c`               | le produit de a, b et c                                          |
| B7  | `a ÷ b`, `\frac{a}{b}`    | le quotient de a par b                                           |
| B8  | `−a`                      | l'opposé de a                                                    |
| B9  | `x²`, `x³`, `x⁴`, `x⁻¹`   | le carré de x ; le cube de x ; x puissance 4 ; x puissance −1    |
| B10 | `√a`                      | la racine carrée de a                                            |
| B11 | `(a + b)`                 | les parenthèses ne se lisent pas : la somme de a et b            |
| B12 | `2x + 3 = 7`              | la somme du produit de 2 par x et de 3 est égale à 7             |
| B13 | `f(x)`, `\sin x`, `\ln x` | l'image de x par f ; le sinus de x ; le logarithme népérien de x |
| B14 | `(2 + x)²`                | le carré de la somme de 2 et x                                   |

- Nombres en chiffres, rendus comme formules ; contractions gérées (« du », « des », « de la »,
  « de l' »).
- Accord : « la somme … est **égale** à », « le produit … est **égal** à ».
- Lecture de la sous-expression survolée dans le panneau, lecture de l'expression entière en
  permanence ; survoler un mot de la lecture encadre sa sous-expression.
- Mots cliquables (somme, différence, produit, quotient, opposé, carré, cube, puissance, racine carrée,
  image…) : la fiche du dictionnaire au niveau de l'élève, comme dans un énoncé. Un mot absent du
  dictionnaire s'affiche sans lien.

### C. Élève de 6e ou avant

| #   | Expression (élève de 6e ou avant)   | Comportement                           |
| --- | ----------------------------------- | -------------------------------------- |
| C1  | `5 − 3 + x`, `10 − 2 − 3`           | message, structure et lecture masquées |
| C2  | `−3 + x`                            | message                                |
| C3  | `2 + 3 + 4`, `5 − 3`, `5 − (3 + x)` | pas de message                         |
| C4  | visiteur, ou élève de 5e et plus    | jamais de message                      |

Texte : « Ajoute des parenthèses pour montrer ce que tu calcules d'abord : (5 − 3) + x ou
5 − (3 + x) ? » — les deux propositions construites depuis l'expression de l'élève.

### D. Accès

Page publique **`/test-structure`** (la démo devient la page, décision de David) ; rien n'est
enregistré ; niveau lu par `readReaderGrade()` (`profiles.grade`).

Points proposés par Claude et acceptés : « x puissance 4 » (B9) ; survol de « sin » = la fonction
appliquée (A8) ; cadres englobants en pointillés gris (A10).

## Plan

| Lot | Contenu                                                                                       | Agent                   |
| --- | --------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | `mathAST` : arbre de structure (aplati, signe à la somme, arguments de fonctions)             | `mathast-expert` (Opus) |
| 2   | `mathAST` : lecture en français, mots rattachés aux sous-expressions                          | `mathast-expert` (Opus) |
| 3   | règle « 6e ou avant » et propositions de parenthèses                                          | `mathast-expert` (Opus) |
| 4   | page `/test-structure`, encadré, panneau, sens inverse, mots cliquables (`LexiconTerm`)       | `svelte-expert` (Opus)  |
| 5   | définitions manquantes du dictionnaire (membre, carré, cube…) : proposées, validées par David | session principale      |

Tests d'abord (rouges) à chaque lot ; `code-reviewer` en fin de lot.

## Journal

- 2026-10-11 — démo validée ; Q1-Q15 tranchées ; glossaire à jour (a81a98d56).
- 2026-10-11 — spécification validée ; page = `/test-structure`. Lot 1 lancé dans le worktree
  `../ubumaths-wt-structure` (branche `feat/demo-structure-expression`).
