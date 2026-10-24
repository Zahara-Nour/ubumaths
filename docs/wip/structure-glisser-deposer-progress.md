# Structure d'une expression : glisser-déposer — phase 0

## Reprendre ici

_Mis à jour le 2026-10-24, après #1358 (état vérifié dans git et sur `production`)._

- **État** : lot 1 (#1332) et lot 2 (#1358, `StructureField`) en prod depuis la v0.30.0 ;
  correctif d'exposant #1346 en prod. Le champ ne sert que dans `/test-structure`.
- **Prochaine action** : lot 3 — G7 (numérateur / dénominateur et côtés d'un `÷` refusés, avec
  la phrase E2.6-E2.7) et E6 (déplacer aux flèches). Rien de codé.
- **En attente de David** : au doigt, plus d'exploration de la structure (le toucher bref
  écrit) ? ; vérifications manuelles #1346 et #1358 (`verifications-manuelles.md`) ; branchement
  dans l'Atelier (« pas pour l'instant »).
- **Pièges en cours** : `toLatex(multiply(2, divide(12, 3, 'ratio')))` écrit `2 \times 12 : 3`
  (repéré à la revue du lot 1, jamais signalé ni corrigé).
- **Lié** : chantier `demo-debug` — `/test-structure` sera coupée en deux, la formule dans la
  vitrine (`/demo/structure`), le corpus dans `/dev/structure`.
- **Worktree / branche** : aucun (`ubumaths-wt-champ` retiré le 2026-10-24).

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
| G11 | **Option A** : après un déplacement, le signe × seulement où il est obligatoire (devant un nombre, devant une fraction), même si l'élève l'avait écrit ; lâcher une partie à sa place ne change rien. Avant la 5e, pas de calcul littéral : la question ne se pose pas.                             |
| G1  | Sur la page de l'outil **« Structure d'une expression »** (`/test-structure`), pas de page à part.                                                                                                                                                                                                  |
| G2  | Un terme dans sa somme, un facteur dans son produit, **et** les deux membres d'une égalité.                                                                                                                                                                                                         |
| G3  | Passer un terme d'un membre à l'autre : **pas en v1** (transformation, chantier à part).                                                                                                                                                                                                            |
| G4  | Le signe suit le terme ; un `+` en tête disparaît.                                                                                                                                                                                                                                                  |
| G5  | **On bloque** : une partie ne peut pas sortir de son groupe tant que le pointeur est dehors (pas de refus, pas de phrase).                                                                                                                                                                          |
| G6  | **6e ou avant** : glisser **désactivé** pour les termes d'une somme qui contient une **soustraction** (à ce niveau, pas de terme négatif) ; une somme d'additions seules se glisse.                                                                                                                 |
| G7  | Numérateur et dénominateur, les deux côtés d'un `÷` : ne s'échangent pas ; une phrase dit pourquoi.                                                                                                                                                                                                 |
| G10 | Au doigt, comme la démo : un toucher encadre, un second toucher dans le cadre remonte d'un cran, le glisser part dès que le doigt bouge.                                                                                                                                                            |
| —   | **Structure = les cadres** de la démo (partie encadrée, groupe sur un fond clair avec son nom, lecture). **Soulever** : au choix de l'utilisateur (une case). **« Annuler »** : oui, plusieurs retours possibles.                                                                                   |

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

### Démo de la piste 3 (2026-10-13)

Branche locale `feat/demo-glisser-deposer` (worktree `../ubumaths-wt-glisser`, non poussée), page
`/test-glisser` : seuls les termes d'une somme se déplacent. La formule est rendue en HTML simple
(`convertLatexToMarkup`) ; pendant le glisser, elle est redessinée à chaque image avec
`\mathord{\hspace{…em}}` à chaque place (largeur visée = rendu final moins rendu sans le terme,
mesurés hors écran au début du glisser). Réécriture de la somme : `sum-drag.ts` (5 tests).

Mesures (Playwright, glisser du premier terme jusqu'au bout, 8 expressions, de `5 − 3 + x` à une
fraction de sommes avec racine et fractions emboîtées) :

| Moteur   | Rendu moyen  | 95 % sous | Pire     | Images (95 %) |
| -------- | ------------ | --------- | -------- | ------------- |
| Chromium | 0,8 à 2,7 ms | 1,2 à 3,9 | 6,6 ms   | 16,8 ms       |
| WebKit   | 2,3 à 5,2 ms | 4,0 à 6,0 | 11-12 ms | 16,0 ms       |

Aucune image perdue (intervalle à 60 images par seconde). WebKit headless arrondit à 1 ms ; un
iPad n'est pas mesuré. Continuité : un espace presque nul ajoute 0,44 px (invisible) ; un « − »
en tête précédé d'un espace devenait binaire (+20,66 px) → terme groupé `{-3}` (0 px).

### Retours de David sur la démo (2026-10-13)

1. « Je ne vois aucun espace se créer » : l'espace s'ouvrait sous le terme saisi, qui le cachait.
   Demandé : une **boîte de dépôt** classique, et un **fond** au terme déplacé. Fait : boîte en
   pointillés à chaque place ouverte (HTML posé sur l'espace mesuré, `\class{dropgap<k>}`) ;
   `\vphantom` du terme dans l'espace (la ligne garde sa hauteur) ; terme sur une carte, soulevé
   au-dessus de la ligne (case « Soulever », cochée par défaut, pour comparer).
2. « Ça marche plutôt bien » ; demandé : **les facteurs d'un produit** aussi, et **montrer la
   structure algébrique**. Fait :
   - facteurs : produit implicite → la croix devant un nombre ou une fraction (`x × 2`, pas
     `x2`), rien ailleurs (`2x`, `3(x + 1)`) ; produit écrit avec `×` ou `·` → ce signe partout ;
   - structure (lecture de Claude, à confirmer) : au survol, la partie saisissable encadrée, son
     groupe sur un fond clair avec son nom (« somme · 4 termes ») ; pendant le glisser, ce fond
     suit le groupe ; sous la formule, la lecture en français de l'outil Structure (sens inverse
     compris) ;
   - **un clic dans le cadre remonte d'un cran** (A11) : sans lui, `2x` ne se saisissait plus
     en entier (tout point de `2x` est dans `2` ou dans `x`). On glisse ce qui est encadré.

Défauts trouvés en route et corrigés : un terme du dénominateur ne se saisissait pas (la boîte
du numérateur le recouvre → repérage géométrique, la plus petite partie qui contient le point) ;
la lecture restait celle de l'expression précédente (`math-span` ne relit pas son texte →
`{#key}`) ; une partie encadrée gardée d'une expression à l'autre empêchait le glisser suivant.

Mesures après ces ajouts (mêmes 8 expressions, en encadrant d'abord le terme visé) : Chromium
0,5 à 1,5 ms par rendu (pire 4,2) ; WebKit 1,5 à 5 ms (pire 7) ; aucune image perdue.

3. Survol : un facteur d'un terme ne s'encadrait pas toujours. Cause : après un clic (qui
   remonte d'un cran), le terme restait encadré tant que le pointeur restait dedans ; et comme le
   survol encadre déjà, tout clic sur un facteur remontait au terme. Corrigé : à la souris, la
   remontée ne tient que tant qu'on reste sur la partie cliquée. Contrôle : 94 survols (centre de
   chaque terme et facteur des 12 exemples), 0 anomalie.
4. Les `×` : « il faut une politique : on simplifie tout le temps ou pas ? ». Constat (aller-retour
   mesuré) : `3xy` → `xy × 3` → `3 × x × y` ; un `×` obligatoire fait passer tout le produit en
   « écrit avec des × ». **G11 ouverte** :

   | Option                       | Après chaque déplacement                                                                                            |
   | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
   | A. Toujours la forme usuelle | `×` seulement où il est obligatoire (devant un nombre, devant une fraction) ; `3 × a × b` → `3ab`, même écrit ainsi |
   | B. Garder les `×` de l'élève | n'ajouter et ne retirer que les `×` obligatoires ; demande de savoir qui a écrit chaque `×`                         |
   | C. Ne jamais retirer un `×`  | ce que fait la démo (par contagion)                                                                                 |

   **Tranché : A** (voir les décisions). Reco de Claude : A (sans mémoire, l'écriture attendue en classe : notion `N-ECRIT-PRODUIT`,
   « suppression du signe × devant une lettre ou une parenthèse, le nombre s'écrit en premier »,
   5e). Sous-question : avant la 5e, garder tous les `×` ?

Structure algébrique : **les cadres** (confirmé par David le 2026-10-13). Encore à demander :
soulever le terme ou le laisser sous le pointeur ?

## Spécification E — glisser-déposer (validée par David le 2026-10-13)

S'ajoute aux sections A à D de [structure-expression.md](../systeme/mathast/structure-expression.md).
« Partie » : un terme d'une somme, un facteur d'un produit, un membre d'une égalité.

### E1. Ce qu'on saisit

| #    | Cas                                                                                         | Comportement attendu                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1.1 | l'encadré (règle A1) est une partie                                                         | son groupe passe sur un fond clair, avec son nom (« somme · 3 termes », « produit · 2 facteurs », « égalité · 2 membres ») ; curseur « main » ; on peut glisser |
| E1.2 | l'encadré n'est pas une partie (somme entière, exposant, numérateur, contenu d'une racine…) | pas de fond, pas de glisser ; un clic remonte d'un cran (A11) jusqu'à une partie                                                                                |
| E1.3 | `2x + 1`, survol de `x`                                                                     | `x` encadré, fond « produit · 2 facteurs » ; un clic → `2x` encadré, fond « somme · 2 termes » ; on glisse **ce qui est encadré**                               |
| E1.4 | après ce clic, le pointeur passe sur une autre partie                                       | retour à la plus petite partie sous le pointeur                                                                                                                 |
| E1.5 | appui sur le dénominateur d'une fraction                                                    | une partie du dénominateur (la boîte du numérateur le recouvre : repérage par la position des caractères)                                                       |
| E1.6 | formules du corpus                                                                          | survol seul, pas de glisser                                                                                                                                     |

### E2. Pendant le glisser

| #    | Cas                                                        | Comportement attendu                                                                                                                                              |
| ---- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E2.1 | appui sur une partie, puis le pointeur bouge de 4 px       | la partie part sur une carte (fond, bordure, ombre) ; une boîte de dépôt à sa place ; la ligne garde sa hauteur                                                   |
| E2.2 | case « Soulever le terme » (cochée par défaut)             | cochée : la carte monte au-dessus de la ligne ; décochée : elle reste sous le pointeur                                                                            |
| E2.3 | le pointeur passe d'une place à une autre                  | la boîte s'ouvre en douceur à la nouvelle place et se referme à l'ancienne ; toute l'expression s'élargit (barre de fraction, racine, parenthèses) ; le fond suit |
| E2.4 | (G5) le pointeur sort du groupe                            | la carte s'arrête au bord du groupe, au plus près du pointeur ; la boîte reste à la place la plus proche ; la carte suit de nouveau quand le pointeur revient     |
| E2.5 | touche Échap                                               | la partie revient à sa place, rien ne change                                                                                                                      |
| E2.6 | (G7) glisser commencé sur un numérateur ou un dénominateur | rien ne part ; sous la formule : « Le numérateur et le dénominateur ne s'échangent pas : la fraction changerait de valeur. »                                      |
| E2.7 | (G7) glisser commencé sur un côté d'une division en ligne  | rien ne part ; « Les deux nombres d'une division ne s'échangent pas : le quotient changerait. »                                                                   |

### E3. Au lâcher

| #    | Cas                                         | Comportement attendu                                                                           |
| ---- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| E3.1 | lâcher                                      | la carte se pose dans la boîte ; l'expression est réécrite ; la saisie et les lectures suivent |
| E3.2 | (G4) `5 − 3 + x`                            | `x` en tête → `x + 5 − 3` ; `3` en tête → `−3 + 5 + x` ; `5` à la fin → `−3 + x + 5`           |
| E3.3 | (G11) `3xy`                                 | `3` à la fin → `xy × 3` ; puis en tête → `3xy`                                                 |
| E3.4 | (G11) `a × b × c`, `2 × 3 × 5`, `4 × a × ½` | `c` en tête → `c a b` ; `5` en tête → `5 × 2 × 3` ; `a` en tête → `a × 4 × ½`                  |
| E3.5 | `2(x + 1)(x − 3)`                           | `2` à la fin → `(x + 1)(x − 3) × 2`                                                            |
| E3.6 | `2x + 3 = 7`                                | un membre glissé de l'autre côté du `=` → `7 = 2x + 3`                                         |
| E3.7 | inégalité (`2x < 7`)                        | ses membres ne se glissent pas (il faudrait retourner le signe)                                |
| E3.8 | partie lâchée à sa place                    | rien ne change, pas même un `×` superflu                                                       |
| E3.9 | `a + (−b)`                                  | `(−b)` en tête → `(−b) + a` : la parenthèse écrite par la somme reste                          |

### E4. Annuler

| #    | Cas                                | Comportement attendu                                              |
| ---- | ---------------------------------- | ----------------------------------------------------------------- |
| E4.1 | « Annuler » après des déplacements | revient au déplacement précédent, autant de fois qu'il y en a eu  |
| E4.2 | nouvelle saisie ou exemple chargé  | l'historique repart de zéro ; « Annuler » grisé quand il est vide |

### E5. Élève de 6e ou avant (niveau de l'élève connecté ; visiteur : aucune restriction)

| #    | Cas                                                   | Comportement attendu                                                                                                                                      |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E5.1 | (G6) somme qui contient une soustraction (`12 − 4`)   | ses termes ne se glissent pas : pas de fond de groupe, pas de curseur « main », pas de phrase                                                             |
| E5.2 | somme d'additions seules (`2 + 3 + 4`)                | permis                                                                                                                                                    |
| E5.3 | produit (`2 × 3 × 5`)                                 | permis                                                                                                                                                    |
| E5.4 | `2 × (3 + 4)`, aller-retour du `2`                    | `2 × (3 + 4)`, pas `2(3 + 4)` (écriture vue en 5e). Appliqué comme « × toujours écrit en 6e ou avant » (`2 × π × r`) : **décidé par David le 2026-10-14** |
| E5.5 | le message « 6e ou avant » remplace la structure (C1) | rien ne se glisse                                                                                                                                         |

### E6. Au clavier (proposition de Claude)

| #    | Cas                                | Comportement attendu                                                                                          |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| E6.1 | une partie encadrée, flèche ← ou → | elle change de place d'un cran (même réécriture qu'au lâcher) ; une autre voie que le glisser (accessibilité) |

### Choix techniques (validés par David le 2026-10-13)

- La formule de l'outil passe du `math-span` (shadow DOM, figé) au rendu de MathLive dans la page
  (`convertLatexToMarkup`, comme l'Atelier et la démo), corpus compris : un seul chemin. Rendu
  identique à l'œil ; c'est ce qui permet de redessiner à chaque image (piste 3).
- La réécriture (déplacer une partie, signes, règle des `×`, membres) devient un module pur de
  `src/lib/mathAST/structure/`, repris de `sum-drag.ts` de la démo ; la démo reste locale et part
  à la poubelle.
- Lots : 1) module de réécriture et ses tests (E3, E5.1-E5.4) ; 2) rendu dans la page et glisser
  dans l'outil (E1, E2) ; 3) Annuler, G7, clavier (E4, E2.6-E2.7, E6). Tests d'abord, vus en échec.
  Agents : lot 1 dans la session principale ; `code-reviewer` (Opus) en fin de chaque lot.

## Journal

- 2026-10-13 — ouverture : lecture de l'article Algebria, inventaire de l'existant, questions
  G1-G10. Aucun code, aucun test.
- 2026-10-13 — G8 et G9 tranchées par David ; G1-G7 et G10 encore ouvertes.
- 2026-10-13 — G9 : idée de David (rendu malléable pendant le glisser) ; trois pistes comparées, piste 3 recommandée, démo à valider.
- 2026-10-13 — démo de la piste 3 (`/test-glisser`) : rendu de 1 à 5 ms par image, pire 12 ms (WebKit) ; à juger par David.
- 2026-10-13 — retours de David : boîte de dépôt visible, carte du terme saisi ; puis facteurs
  d'un produit, structure au survol, clic qui remonte d'un cran, lecture (démo, commit local
  8b303bce0). 11 tests verts.
- 2026-10-13 — survol d'un facteur corrigé (commit local 979180230) ; G11 (politique des `×`)
  posée à David.
- 2026-10-13 — G11 tranchée (A) ; démo à jour (commit local, `movedLatex`, 13 tests) : `3xy` →
  `xy × 3` → `3xy` vérifié dans le navigateur.
- 2026-10-13 — « la structure, c'est bien les cadres » (David).
- 2026-10-13 — réponses de David : d'accord avec les recos sauf G5 (bloquer), Soulever (au choix),
  G6 (désactiver les sommes avec soustraction en 6e). Spécification E rédigée, à valider.
- 2026-10-13 — spécification E validée (« ok pour ce que tu proposes ») ; but final de David : un
  champ de formule réglable (structure oui/non, déplacer oui/non), réutilisable dans l'Atelier ou
  ailleurs → lot 2 = ce composant. Questions posées : passer d'écrire à manipuler dans le même
  champ (reco : curseur dedans = écrire, dehors = manipuler, double-clic ou crayon pour revenir),
  réglages (structure, lecture, déplacer ⇒ structure), E5.4 étendu à « × toujours écrit » en 6e.
- 2026-10-13 — lot 1 : `src/lib/mathAST/structure/rearrange.ts` (29 tests, vus rouges d'abord),
  branche `feat/structure-reecriture`.
- 2026-10-13 — revue du lot 1 (`code-reviewer`, Opus) : 590 déplacements du corpus, 0 anomalie.
  Corrigé : un quotient en ligne posé après un autre facteur prend des parenthèses (`12 : 3 × 2`,
  `2` en tête → `2 (12 : 3)` ; sans elles, `(2 × 12) : 3`) — signalé à David, l'autre option
  serait de figer ces produits ; tests des parenthèses de l'écriture usuelle (`2×-3`, `--3+x`),
  vus rouges en les retirant ; décimal `.5` ; fantôme sans marqueurs. Repéré, hors chantier :
  `toLatex(multiply(2, divide(12, 3, 'ratio')))` écrit `2 \times 12 : 3` (à signaler).
- 2026-10-13 — **lot 1 mergé : PR #1332** (b03cb0b88), CI verte ; pas en prod. Lot 2 (champ de
  formule réglable) en attente des réponses de David (écrire / manipuler, réglages, E5.4).
- 2026-10-13 — lot 1 (#1332) en prod avec la v0.29.0 (sans effet visible : pas encore d'interface).
- 2026-10-13 — **gestes du champ (David)** : un seul mode, pas de bascule écrire / manipuler.
  Clic court → le curseur se place (on écrit) ; clic tenu puis on bouge → on déplace ; pas de
  remontée d'un cran ni d'élargissement de cadre : les cadres sont imbriqués, on attrape `2x` sur
  la bordure de son cadre (hors des cadres de `2` et de `x`). Tactile détecté
  (`any-pointer: coarse`) : bordures larges et formule écartée autour des parties, seulement si
  le champ affiche la structure et autorise le déplacement. Essai dans la démo (commit local) :
  appui armé après 300 ms (bougé avant : rien, ce serait une sélection de texte), bordure par
  niveau de parties contenues (souris 0,2 em, tactile 0,3 em), curseur placé au même endroit
  relatif dans le champ. Vérifié Chromium et WebKit ; iPad émulé reconnu tactile. À juger par
  David, sur Mac et sur iPad.
- 2026-10-13 — retour de David (« le drag ne marche plus », « problème avec les cadres ») : le
  délai de 300 ms avant de déplacer cassait le geste naturel (appui puis mouvement) → retiré :
  appui puis mouvement = déplacer, appui relâché sans bouger = curseur. Les marges verticales qui
  grandissaient par niveau débordaient sur la barre de fraction → bordure par niveau à gauche et à
  droite seulement. Tous les cadres à la fois devenaient illisibles → au survol, seulement ceux qui
  contiennent la partie visée et ceux qu'elle contient (au doigt : tous). « Lourde » : 21 parties
  sur 21 se glissent.
- 2026-10-13 — « encore beaucoup de parties encadrées » : au survol, seulement la partie visée et
  celles qui la contiennent (plus celles qu'elle contient).
- 2026-10-13 — « l'exposant 2 change de hauteur » : défaut de la structure (prod), pas du glisser —
  hors du marqueur de sa base, MathLive plaçait l'exposant d'après le dernier caractère avant `)`.
  **Corrigé : PR #1346 mergée** (aussi `|…|²`, `⌊…⌋²`). Démo : cadres et fonds bornés par la barre
  de fraction (mesure caractère par caractère ; la boîte de police d'un chiffre déborde sous
  l'encre), nom du groupe sous son fond dans un dénominateur.
- 2026-10-14 — David suit les recos : **réglages du champ** = « structure » (cadres au survol),
  « lecture » (phrase en français, décochée par défaut hors de l'outil), « déplacer » (allume
  « structure ») ; **6e ou avant : × toujours écrit** (E5.4). Gestes : clic court = curseur,
  appui puis mouvement = déplacer, cadres imbriqués (bordure), mode tactile. Prochaine étape :
  spécification du lot 2 (le champ réutilisable) à valider.
- 2026-10-14 — **spécification F du lot 2 validée par David** (le champ réutilisable) : F1 réglages
  structure / lecture / déplacer (+ « soulever », case) ; F2 souris : survol, clic court = écrire
  (Entrée ou clic ailleurs = retour, Échap = annuler la frappe), appui sur une partie puis
  mouvement = déplacer, cadres imbriqués bornés (signe voisin, groupe, barre de fraction) ; F3
  doigt : cadres visibles, bordures larges, formule écartée, toucher bref = écrire (remplace A11) ;
  F4 = E2/E3 ; F5 « Annuler » (plusieurs retours, une frappe vide l'historique) ; F6 lecture ;
  F7 6e. Lot 3 : G7 (phrase), E6 (flèches). Dans l'outil, le champ remplace la case de saisie ET
  la formule explorée ; corpus inchangé. **Survol (David, « oui ») : les règles A restent** (plus
  petite sous-expression quelle qu'elle soit, lecture, options), cadres imbriqués pour attraper
  `2x` par sa bordure ; on ne glisse que si l'encadré est une partie (alors fond du groupe + nom).
- 2026-10-14 — **lot 2 mergé : PR #1358** (CI verte) — `StructureField` / `InteractiveFormula` /
  `frame-geometry.ts` dans `$lib/components/structure/`, branché dans `/test-structure`. Revue :
  pointercancel, clavier (rôle bouton, Entrée), contours tactiles, gardes « changé d'ailleurs ».
  Question ouverte à David : au doigt, plus d'exploration de la structure (le toucher bref écrit).
  Pas en prod. Serveur d'essai : worktree `../ubumaths-wt-champ`, port 5179.
- 2026-10-24 — état vérifié : lots 1 et 2 en prod (v0.30.0) ; lot 3 pas commencé. Worktree
  `ubumaths-wt-champ` retiré (accord de David). Bloc « Reprendre ici » ajouté.
