# Chantier `cartes-entrainement` — cartes de cours hors des formes qui corrigent

## Reprendre ici

_Mis à jour le 2026-11-09, avant la PR._

- **État** : PR ouverte (cartes de cours retirées de l'Entraînement) · **Prochaine action** : merge, puis liste des questions de cours sur les suites (1re spé) à proposer à David · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-cartes-entrainement`, `fix/cartes-hors-entrainement`

## Décision (David, 2026-11-09)

Une carte de cours (non évaluable) n'est retirée que des formes qui corrigent les réponses :
Entraînement, Course aux nombres, contrôles. Elle reste en Flash-cards et En classe. Le marqueur
« Question de cours » vaut aussi pour des questions évaluables (QCM, vrai/faux, étapes à ranger…),
jamais retirées.

## Journal

- 2026-11-09 : `seriesFormExcludesCourseCards(mode)` (`src/lib/questions/course-card.ts`), branchée
  au lancement et au « Recommencer » de `/automaths/test`. Série faite seulement de cartes lancée en
  Entraînement → message d'erreur au lieu d'une série vide. ADR 0009 et CONTEXT.md précisés.
