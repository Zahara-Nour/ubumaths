# Structure d'une expression : glisser-déposer — phase 0

> Chantier ouvert le 2026-10-13 à la demande de David (Q6 de la
> [structure d'une expression](../systeme/mathast/structure-expression.md) : « pas en v1, phase 0 à
> part »). L'Atelier n'est **pas** concerné pour l'instant (décision de David du 2026-10-13).
> Rien n'est décidé : questions ci-dessous, à trancher par David.

## Ce qu'en disait Algebria (article 487 de MathemaTICE, 2013)

« On peut déplacer les termes, facteurs, membres d'une expression. J'espère que cela permettra aux
élèves de bien voir ce qui peut être déplacé ou non dans une expression. » La sous-expression qui a
le focus (celle qu'encadre le survol) se déplace par un glisser de la souris. L'article ne détaille
ni les déplacements refusés ni le retour donné à l'élève.

## Ce qui existe déjà (vérifié dans le code le 2026-10-13)

- L'arbre de structure (`src/lib/mathAST/structure/`) : somme de n termes signés, produit de n
  facteurs, relation à deux membres ; chaque sous-expression garde son nœud d'AST (`ast`) et son
  rôle (`term`, `factor`, `left-side`…).
- `src/lib/mathAST/flatten.ts` : `flattenSumShallow` / `unflattenSum`,
  `flattenProductShallow` / `unflattenProduct`, `flattenRelationChain` / `unflattenRelationChain`
  — de quoi réécrire une expression après un déplacement sans passer par `simplify`.
- L'encadré au survol et au toucher (`/test-structure`, `StructureFormula.svelte`), avec le
  repérage par zone de caractères (fiable dans les fractions).

## Questions (à trancher par David)

| #   | Question                                                                                                                                     | Recommandation                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| G1  | Où ?                                                                                                                                         | `/test-structure`, comme l'encadré.                                                                              |
| G2  | Quels déplacements en v1 ?                                                                                                                   | (a) un terme dans sa somme, (b) un facteur dans son produit, (c) échanger les deux membres d'une égalité.        |
| G3  | Un terme passe-t-il d'un membre à l'autre (`2x + 3 = 7` → `2x = 7 − 3`) ? Et un facteur (→ division) ?                                       | Pas en v1 : c'est une transformation, pas un déplacement ; phase 0 à part.                                       |
| G4  | Le signe suit-il le terme ? `5 − 3 + x`, `−3` glissé en tête → `−3 + 5 + x` ; `x` en tête → `x + 5 − 3`.                                     | Oui : le signe appartient à la somme (Q2), il voyage avec le terme ; un `+` en tête disparaît.                   |
| G5  | Déplacement refusé (sortir un terme de ses parenthèses, un facteur hors de son produit, un terme dans un autre membre) : que se passe-t-il ? | L'objet revient à sa place, avec une phrase qui dit pourquoi (« 3 est un terme de la somme entre parenthèses »). |
| G6  | Élève de 6e ou avant : déplacer un terme précédé de « − » fait apparaître un relatif (`−3 + 5`).                                             | Refusé avec le message « 6e ou avant » existant ; les sommes sans « − » et les produits restent permis.          |
| G7  | Une fraction `\frac{a}{b}` : numérateur et dénominateur sont-ils déplaçables (échange) ? Un quotient en ligne `a ÷ b` ?                      | Non : ils ne commutent pas ; refus avec une phrase.                                                              |
| G8  | Trace des déplacements : l'expression change en place (avec « Annuler »), ou chaque déplacement ajoute une ligne en dessous (`=` ou `⇔`) ?   | Une ligne par déplacement : l'élève voit que l'expression reste égale ; « Annuler » retire la dernière.          |
| G9  | Pendant le glisser : où peut-on lâcher ? montrer les places possibles (traits entre les termes) ?                                            | Montrer les places permises (un trait) dès que le glisser commence ; rien ailleurs.                              |
| G10 | Tactile : le toucher sert déjà à encadrer (A11, un toucher remonte d'un cran).                                                               | Appui long puis glisser = déplacer ; toucher bref = encadrer, comme aujourd'hui.                                 |

## Décisions de David (2026-10-13)

| #   | Décision                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G8  | **Pas de nouvelle ligne** pour l'instant : l'expression change en place.                                                                                                                                                                                                                            |
| G9  | **Comme Algebria** : pendant le glisser, un **espace s'ouvre** là où l'expression peut être posée, sous forme d'un bloc qui apparaît de façon **fluide** ; **toute l'expression adapte sa taille** ; le bloc **disparaît** si l'on continue à glisser plus loin (il se rouvre à la place suivante). |

### G9 : comment rendre l'expression malléable pendant le glisser (2026-10-13)

Idée de David : au début du glisser, remplacer le rendu de MathLive par quelque chose de plus
simple et malléable, puis revenir à MathLive au lâcher. Aujourd'hui la formule explorée est un
`math-span` (rendu dans un shadow DOM, figé). Trois façons de le faire :

| Piste                                         | Principe                                                                                                                                                                                                   | Pour                                                                                                    | Contre                                                                                                                          |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1. Nos propres blocs HTML                     | chaque sous-expression devient une boîte CSS ; l'espace est une boîte dont la largeur s'anime ; le navigateur recalcule tout à chaque image (comme Algebria, qui avait son propre moteur)                  | fluidité native ; une barre de fraction s'allonge seule                                                 | refaire la typographie de MathLive (fractions, exposants, racines, parenthèses extensibles) ; écart de rendu visible au passage |
| 2. Calque de morceaux, positions par MathLive | on découpe le rendu en morceaux (glyphes, barres), MathLive calcule hors écran le rendu visé, on anime les morceaux d'une position à l'autre                                                               | exact au départ et à l'arrivée                                                                          | beaucoup de comptabilité : suivre chaque glyphe d'un rendu à l'autre, signes qui apparaissent ou disparaissent                  |
| 3. MathLive redessine à chaque image          | on passe du `math-span` au rendu statique de MathLive dans la page (`convertLatexToMarkup`, déjà utilisé par l'Atelier) ; à chaque image, un `\hspace` grandit à la place visée et se referme à l'ancienne | chaque image est un vrai rendu MathLive (fractions, racines s'élargissent juste) ; aucun saut au retour | un rendu par image : coût à mesurer, surtout sur Safari et iPad                                                                 |

Recommandation : **piste 3**, éprouvée par une démo jetable qui mesure le temps d'un rendu par
image (objectif : moins de 8 ms) sur Chromium et WebKit, avec une expression lourde (fraction dont
le numérateur est une somme). Repli si trop lent : piste 2.

## Journal

- 2026-10-13 — ouverture : lecture de l'article Algebria, inventaire de l'existant, questions
  G1-G10. Aucun code, aucun test.
- 2026-10-13 — G8 et G9 tranchées par David ; G1-G7 et G10 encore ouvertes.
- 2026-10-13 — G9 : idée de David (rendu malléable pendant le glisser) ; trois pistes comparées, piste 3 recommandée, démo à valider.
