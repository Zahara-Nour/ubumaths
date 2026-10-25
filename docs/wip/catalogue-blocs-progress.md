# Catalogue des blocs ubumark (aide à l'écriture + vitrine)

## Reprendre ici

_Mis à jour le 2026-10-25, PR 2 ouverte._

- **État** : PR 1 mergée (#1764). PR 2 (vitrine `/demo/blocs`) ouverte, CI en cours ; à son
  merge, les deux PR attendent `deploy:prod`. Serveur de test : `http://localhost:5177/demo/blocs`.
- **Prochaine action** : merger la PR 2 (CI verte), puis clore le chantier (versement : la doc
  durable est déjà dans `docs/systeme/utilitaires-et-demos.md`, archiver ce journal).
- **En attente de David** : regard sur les pages (aide et vitrine). Erreurs muettes des
  parseurs : chantier à part `erreurs-blocs`.
- **Pièges connus** : la division posée est une grille, pas un svg (test de rendu de la vitrine).
- **Worktree / branche** : `../ubumaths-wt-catalogue-blocs` · `feat/catalogue-blocs-vitrine`.

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

## PR 1 — aide à l'écriture (2026-10-25)

- Fiches : `src/lib/block-catalog/<bloc>.ts` (`BlockCatalogEntry`, `fence()`), liste `BLOCK_CATALOG`
  dans l'ordre de la phase 0. Écrites par 5 agents Sonnet en parallèle, horloge comme modèle.
- Page commune `src/lib/components/block-catalog/BlockHelpPage.svelte` (réglages, exemples avec
  « Copier », erreurs fréquentes, « Essayer »), rendus avec `showAuthoringErrors`.
- Routes : `/aide-ecriture/blocs` (`PageIndex`), `/aide-ecriture/blocs/[bloc]` (`+page.ts`
  statique, 404 sinon) ; `/aide-ecriture/cercle-trigo` garde son adresse (`href` de la fiche, pas
  de double sous `/blocs`), son test compte maintenant les cadres d'erreur des erreurs fréquentes.
- Tests : `src/lib/block-catalog/__tests__/catalogue.test.ts` (chaque exemple accepté, bon type de
  nœud ; message de chaque erreur fréquente), `BlockHelpPage.svelte.test.ts` (rendu de chaque
  fiche, zone « Essayer » en direct).

### Ce que les fiches ont révélé (erreurs muettes, futur chantier `erreurs-blocs`)

- **variation** : `5,5` (et un signe ou une position inconnus) → case supprimée en silence, tableau
  faux sans message ; sans `domain:` ou `variable:` → texte brut. La notation
  `domain: ]-inf, 1[, ]1, +inf[` annoncée dans l'en-tête du parseur donne des points faux.
- **probtree** : `0,5` lu comme probabilité 0, issue « 5 » ; somme ≠ 1 : avertissement calculé
  mais jamais montré ; mauvais retrait → texte brut.
- **line** : toute erreur → texte brut sans message ; clé inconnue ignorée ; point hors bornes =
  erreur, segment hors bornes = avertissement.
- **trig** : `color` sans contrôle ; `projections`/`grid` vrais seulement pour `true`, `axes`/
  `labels`/`values` vrais sauf `false` (une faute de frappe agit dans les deux sens).

## PR 2 — vitrine `/demo/blocs` (2026-10-25)

- Sélection : `src/lib/block-catalog/showcase.ts` (`SHOWCASE_SECTIONS`, `SHOWCASE_ITEMS`), un
  renvoi (slug de fiche + titre d'exemple) par bloc, textes écrits pour un visiteur. Primaire :
  horloge (durée entre deux horloges), division euclidienne, quarts sur une droite graduée ;
  collège : barres, circulaire, nuage avec ajustement ; lycée : dérivée et variations,
  probabilités conditionnelles, parabole et tangente.
- Page `src/routes/(public)/demo/blocs/+page.svelte` : titre « Les blocs du prof », cartes en
  3 colonnes, rendu sans `showAuthoringErrors`, texte replié sous « Voir ce qu'écrit le prof ».
- `DEMO_PAGES` : entrée placée après le cercle trigo (même famille de contenu), ordre du test mis
  à jour. Carte des fonctionnalités : 11 vitrines.
- Tests : `showcase.test.ts` (9 blocs de la phase 0 par niveau, renvois valides, renvoi cassé
  lève), `page-demo-blocs.svelte.test.ts` (titres, 9 rendus, 9 `details` repliés, aucun message
  d'erreur).
