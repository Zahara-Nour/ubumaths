# Chantier `corrections-modeles` : correction concise / détaillée et corrections générées

## Reprendre ici

_Mis à jour le 2026-11-16, à l'ouverture du chantier._

- **État** : chantier ouvert, phase 0 (étude), aucun code · **Prochaine action** : faire l'état des lieux (§ Étude) puis poser à David les questions de phase 0 · **En attente de David** : Q1 à Q3 ci-dessous · **Pièges en cours** : ne pas refaire ce que l'ADR 0017 et Q91–Q101 ont déjà tranché ; le dire si une proposition y revient · **Worktree / branche** : aucun (étude seulement) ; au premier code → `ubumaths-wt-corrections-modeles`

## Origine

Demande de David du 2026-11-16, à la suite du retour A1 (2) du chantier [`cours-suites`](cours-suites-progress.md).
Aucune des 30 cartes « Cours : … » n'a de marqueur de détail, donc leur correction concise est identique à la
détaillée. Ce chantier ne se contente pas de marquer les 30 cartes : il reprend la question en entier.

1. **Prise en compte** : comment les modèles portent une correction concise et une correction détaillée.
2. **Affichage** : ce qu'on montre selon la situation (flash-cards, révision, Entraînement, En classe,
   évaluation, aperçu prof, fiches PDF).
3. **Corrections générées par mathAST** : peuvent-elles remplacer les corrections écrites à la main dans
   les modèles ? Pour quels modèles, et à quelles conditions ?

## Déjà tranché (à ne pas re-proposer sans le dire)

- [ADR 0017](../adr/0017-correction-concise-et-detaillee.md) : un seul champ de correction, détails marqués dans
  le texte (`\detail{…}`, `> [!méthode|rappel|attention]`, `[…]{.rappel}`…), transformation avant le rendu,
  ouverture en concis, un seul interrupteur.
- Journal [`correction-concise-detaillee`](correction-concise-detaillee-progress.md) (D1–D12, Q88–Q90) :
  - lot 1 (transformation, composant, flash-cards et cartes de cours) livré par #636 ;
  - lot 3 (fiches PDF) fait le 2026-10-11 ;
  - **lot 2** (autres affichages et aperçu prof) **et lot 4** (mode B : concise = `summarized`,
    détaillée = `detailed`) restent à faire.
- [Q91–Q101](correction-trois-niveaux-et-questions-de-cours.md) : trois niveaux (résultat attendu → concise →
  détaillée), places selon la situation (Q91), présentation des réponses fausses (Q92–Q93), résultat attendu
  construit automatiquement (Q94), correction d'une carte de cours (Q96).

## Étude (à faire)

- [ ] Prod : combien de modèles ont des étapes écrites à la main (mode A), combien utilisent `generatedSteps`
      (mode B), combien ont au moins un marqueur de détail.
- [ ] Code : où chaque situation affiche la correction aujourd'hui, et ce que chacune fait des détails
      (relevé à faire dans le code, pas dans la doc).
- [ ] mathAST : quelles familles de modèles une correction générée sait traiter (calcul, développement,
      équation…), et ce qu'elle produit en `summarized` et en `detailed`. Comparer avec les corrections
      écrites à la main sur un échantillon de modèles publiés.
- [ ] Cartes de cours : une correction générée n'a pas de sens pour une connaissance. Que faut-il marquer
      comme détail sur ces cartes (démonstration, rappel, exemple) ?

## Questions de phase 0 (en attente de David)

- **Q1 : sort du journal `correction-concise-detaillee`.** Ce chantier reprend-il ses lots 2 et 4, son journal
  étant archivé après versement ? Ou les deux restent-ils séparés ?
- **Q2 : rôle de la correction générée.** Si mathAST sait corriger un modèle, la correction générée
  remplace-t-elle la correction écrite (qu'on supprime), ou sert-elle seulement quand rien n'est écrit ?
  Le prof peut-il choisir modèle par modèle ?
- **Q3 : les 30 cartes de `cours-suites`.** Leur publication attend-elle la fin de ce chantier, ou peuvent-elles
  sortir avec une correction concise identique à la détaillée (cas D4 de l'ADR, prévu) ?

## Journal

- 2026-11-16 : chantier ouvert à la demande de David ; renvoi depuis `cours-suites` (retour A1 (2)).
