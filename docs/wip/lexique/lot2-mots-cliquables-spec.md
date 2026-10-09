# Lexique — lot 2 : mots cliquables dans les énoncés (spécification, à valider)

Proposée le 2026-10-09. Rien n'est codé avant la validation de David (CLAUDE.md, « Phase 0 »).

## Décisions déjà prises par David (2026-10-08)

- Repérage **mixte** : automatique, plus un marquage à la main dans le texte.
- Niveau de lecture = **celui de l'élève**.
- Définitions **masquées en évaluation notée**.
- Rien côté serveur pour les traces (pas de suivi des clics).
- Stockage en base et page d'administration : plus tard.

## Mesure (énoncés publiés, 2026-10-09)

3 212 énoncés ; **1 727 (54 %)** contiennent au moins un mot du dictionnaire, **4 mots en moyenne**
(sans compter les formules `$…$`). Les plus fréquents : expression (511 énoncés), fonction (358),
calcule (249), équation (195), détermine (169), unité (158), image (140), convertis (132), repère
(129), courbe, suite, entier (127), moyenne (125), fonction affine (105), résous (93), repère
orthonormé (88).

Pièges mesurés :

- le synonyme « premier » (de « nombre premier ») attrape « le premier terme » ;
- des homonymes fréquents : image (140), plan (61), terme (77), degré (73), suite (127).

## Où (carte du code, 2026-10-09)

Les énoncés passent par ubumark (`parseMarkdown` → AST → `MarkdownRenderer`), et le texte hors maths
aboutit dans `TextNode.svelte`. Points d'appel élève : `QuestionCard` (entraînement, évaluation),
`FlashCard` (séries, révisions), `FillBlanksInput`, `MultipleChoiceInput`. Les corrections passent
par le même moteur (`CorrectionView`). Le niveau de l'élève est `profiles.grade`, il ne descend pas
encore jusqu'au rendu. Le drapeau d'évaluation notée est `collectOnly`. Précédent d'élément cliquable
avec popover : `HintReference.svelte`.

## Comportements proposés (chacun deviendra un test)

### Repérage automatique

1. Un mot du dictionnaire, visible au niveau de l'élève, est souligné discrètement dans le texte
   d'un énoncé ; un clic ouvre sa fiche.
2. **Mots entiers** : « trace » ne s'allume pas dans « tracé » ; « angle » pas dans « rectangle ».
3. **Accents exacts** (seule la casse est ignorée) : « tracé » n'est pas « trace », « ordonnée »
   n'est pas « ordonne ».
4. **Pluriel** : un « s » ou un « x » final est admis sur chaque mot (« nombres premiers »,
   « fractions égales »).
5. **L'expression la plus longue gagne** : « repère orthonormé » plutôt que « repère », « fonction
   affine » plutôt que « fonction ».
6. **Première occurrence seulement** : un mot n'est souligné qu'une fois par énoncé.
7. Formes conjuguées reconnues (« Calcule », « Résous ») ; jamais les mots de la liste fermée
   (`autoLink: false`).
8. Jamais dans une formule `$…$`, un code, un lien ou un indice ; les tableaux plus tard (rendu à
   part).

### Fiche (popover)

9. Elle montre le mot, son sens, et les définitions **lisibles au niveau de l'élève** (filières
   partagées comprises) ; un renvoi montre la définition de sa cible (« Voir : X »).
10. **Homonymes** : tous les sens visibles de l'élève, chacun avec son étiquette (« carré
    (puissance) », « carré (géométrie) »).
11. Lien « Voir dans le glossaire ». Ouverture au clic (pas au survol), fermeture par Échap ou clic
    à côté ; utilisable au clavier.

### Niveau et contexte

12. Élève connecté : son niveau (`profiles.grade`). Visiteur, ou professeur sans niveau : le plus
    petit niveau de la question (définitions les plus simples).
13. **Évaluation notée** (`collectOnly`) : aucun mot souligné. Les corrections affichées après
    l'évaluation, oui.
14. Énoncés, réponses de QCM, textes à trous et corrections ; pas les messages du chat, les fiches
    d'exercices, ni les consignes en texte brut (plus tard si besoin).

### Marquage à la main (même syntaxe que les détails de correction, ADR 0017)

15. `[mot]{.def}` souligne un mot, même s'il est dans la liste fermée.
16. `[mot]{.def=carré (géométrie)}` choisit l'entrée (utile pour un homonyme ou une forme rare).
17. `[mot]{.nodef}` empêche un soulignement automatique.
18. Un marquage vers un mot absent du dictionnaire n'affiche rien de cassé pour l'élève : le texte
    reste normal.

## Questions de contenu (à trancher par David)

- **« premier »** : retirer ce synonyme de « nombre premier » (il attrape « le premier terme ») ?
- **« expression »** (511 énoncés, 16 %) : la garder soulignable, ou l'ajouter à la liste fermée ?
