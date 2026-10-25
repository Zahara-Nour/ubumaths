# Chantier « pdf-paragraphe-colle » — un paragraphe ne reste pas seul en bas de page

## Clôture

_Chantier CLOS le 2026-10-26 (journal archivé)._

- **Livré** (sur `main`, pas encore en prod) : #1791 — paragraphe `sticky` devant tout bloc sauf paragraphe / titre / trait ; premier paragraphe d'un élément de liste porté par `ubu-item(…, tete: […])` ; crochets du texte d'auteur échappés (un `]2 ; 3[` faisait échouer tout le PDF, déjà sur `main`).
- **Doc durable** : `docs/systeme/ubumark.md` (§ options du générateur, « Paragraphe collé au bloc qui le suit »).
- **Effet visible** : dans une liste, le bloc qui suit le premier paragraphe d'un élément est centré (il restait à gauche).
- **Non couvert au rendu** (texte généré seulement) : `tete` avec cadre de réponse (`afterQuestion`) et en colonnes.

## Origine

Recette du bloc ` ```monnaie ` (2026-10-25) : au PDF, « 30 pièces en vrac : » finit en bas de la page 1, son bloc part en page 2. Point noté « hors chantier, tous les blocs ».

## Cause

Rien ne lie un paragraphe au bloc qui le suit : le bloc dessiné est insécable (`breakable: false`), il part en entier sur la page suivante, le paragraphe reste. Typst a ce qu'il faut : `block(sticky: true)`, déjà utilisé pour les cadres de réponse (`keepWithNext`).

## Décision (David, 2026-10-26)

Portée : un paragraphe est collé à **tout bloc sauf** un autre paragraphe, un titre ou un trait (dessins, formules centrées, tableaux, listes, citations). Recommandation suivie.

## Comportements

- Nominal : « INTRO : » puis un bloc → `#block(width: 100%, sticky: true)[INTRO :]` ; au PDF, INTRO change de page avec son bloc (vérifié pour 9 hauteurs de remplissage, au niveau du document et dans une liste).
- Limite : devant un paragraphe, un titre, un trait, ou en fin de document → rien ne change. Seul le paragraphe juste avant le bloc est collé.
- Liste : premier paragraphe d'un élément suivi d'un bloc (ou de sous-questions) → `tete:` de `ubu-item`, numéro compris. Paragraphes suivants : `#block` collé comme au niveau du document. Élément d'un seul paragraphe : inchangé.

## Journal

- 2026-10-26 : preuve sur la recette de la monnaie (correctif posé à la main dans le Typst, INTRO passe en page 2). Première version : le premier paragraphe d'un élément en `#block` → le numéro seul sur sa ligne (vu au rendu) → `tete:` dans `ubu-item`. Effet de bord : le bloc qui suit ce premier paragraphe est centré (il restait à gauche sur `main`, alors que le générateur demande `align(center)`). Tests : `generators/__tests__/paragraphe-colle-typst.test.ts`, rouge sur `main` (INTRO séparé pour 24 à 32 lignes), vert ici ; empreintes de 4 tests mises à jour (énoncé collé, en-tête qui contient `sticky`).
- 2026-10-26, revue `code-reviewer` : un `]` du texte (intervalle `]2 ; 3[`) ferme le contenu `[…]`. Compilé pour de vrai : déjà cassé sur `main` (paragraphe seul suivi d'un bloc), et la PR déplaçait la panne (tête d'élément). Correctif : `escapeTypstBrackets` sur le texte des nœuds `text` ; test de rendu sur 3 cas ; empreinte de `encadres-typst` (`[y]` → `\[y\]`, même rendu).
