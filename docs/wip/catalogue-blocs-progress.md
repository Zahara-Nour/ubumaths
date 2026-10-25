# Catalogue des blocs ubumark (aide à l'écriture + vitrine)

## Reprendre ici

_Mis à jour le 2026-10-25, phase 0 validée, rien de codé._

- **État** : phase 0 validée par David le 2026-10-25 (4 choix tranchés, ci-dessous). Aucun code.
- **Prochaine action** : PR 1, l'accueil `/aide-ecriture/blocs` et une page par bloc, avec les
  fichiers d'exemples et la zone « Essayer ». Lire d'abord `/aide-ecriture/cercle-trigo` (modèle et
  son test) et `docs/systeme/ubumark.md` § Blocs spéciaux (syntaxe de chaque bloc).
- **En attente de David** : rien.
- **Pièges connus** (chantier demo-debug, `docs/systeme/utilitaires-et-demos.md` § 1) : nouvelle
  vitrine → entrée dans `DEMO_PAGES` + `<SeoHead {...demoSeo(…)} />` ; sous `/aide-ecriture`, ni
  `+layout@` ni donnée sensible par un load universel ; dans `<main>`, `h2`/`p`/`li` ont une
  taille `!important` × `--font-scale` ; nouvelle page d'aide → entrée dans `AIDE_PAGES`.
- **Worktree / branche** : `../ubumaths-wt-catalogue-blocs` · `feat/catalogue-blocs`.

## Origine

Analyse du site demandée par David après la clôture de demo-debug (2026-10-25) : seul le cercle
trigo a une aide à l'écriture, sur les 11 blocs spéciaux d'ubumark. David choisit le catalogue des
blocs parmi les pistes. Restent à trancher par David, hors chantier : `/calculatrice` (NumWorks,
sans lien), `/tuteur` et ses pages sans lien, la migration TinyMath, `/games/evoland`.

## Phase 0 (validée par David le 2026-10-25)

**Périmètre** : les blocs spéciaux d'ubumark. Hors catalogue : les cases à compléter des modèles
de questions (`case:`). Bloc `figure` : l'en-tête seulement (`fenetre:`, `taille:`, `axes:`…),
renvoi vers `/aide-ecriture/geometrie` pour le langage des figures.

### Aide à l'écriture (prof)

- `/aide-ecriture/blocs` liste les blocs : variations ou signes, arbre de probabilités, droite
  graduée, courbe, figure, graphiques statistiques (9 genres, une seule page), QR code, horloge,
  opération posée, et le cercle trigo (**garde son adresse** `/aide-ecriture/cercle-trigo`).
- **Une page par bloc** : tableau des réglages (clé, valeurs, défaut), puis des exemples courts :
  rendu, texte à écrire avec un bouton « Copier », une ligne d'explication.
- **Zone « Essayer »** sur chaque page : champ prérempli avec un exemple, rendu et messages
  d'erreur en direct.
- Opération posée : formes « à remplir » et « résolue » (`cases: aucune`), division en potence.
- Une ou deux **erreurs typiques** par page, avec le message situé que voit le prof (horloge
  `9:30`, `5,5` au lieu de `11/2` dans un tableau…).
- Exemples écrits une fois, un `.ts` par bloc, repris par la vitrine. Un exemple refusé par le
  parseur fait échouer un test.
- Accès inchangé : élève et admin 403, visiteur → connexion.

### Vitrine `/demo/blocs` (public)

- Sélection rangée par niveau : primaire (horloge, opération posée, droite graduée), collège
  (barres, circulaire, nuage de points), lycée (variations, arbre, courbe).
- Idée de la page : « le prof écrit trois lignes, l'élève voit la figure, la fiche PDF aussi ».
- **« Voir ce qu'écrit le prof » replié** sous chaque bloc, comme « Voir le script » de
  `/demo/geometrie`.
- Entrée dans `DEMO_PAGES`, rien lu en base.

### Livraison

1. PR 1 : accueil de l'aide et pages des 10 blocs, avec les fichiers d'exemples (coupée en deux si
   le diff est trop gros).
2. PR 2 : vitrine `/demo/blocs`, avec les mêmes exemples.

Pas de revue de code (pages qui assemblent des composants existants).
