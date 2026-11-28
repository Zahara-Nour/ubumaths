# Chantier `cartes-entrainement` — cartes de cours hors des formes qui corrigent

## Reprendre ici

_Mis à jour le 2026-11-09, après #2528 : chantier clos._

- **État** : mergé (#2528), en attente du prochain `deploy:prod` · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : « cards » est refusé par le test des messages en français (`messages-erreur-en-francais.test.ts`) · **Worktree / branche** : retirés

## Décision (David, 2026-11-09)

Une carte de cours (non évaluable) n'est retirée que des formes qui corrigent les réponses :
Entraînement, Course aux nombres, contrôles. Elle reste en Flash-cards et En classe. Le marqueur
« Question de cours » vaut aussi pour des questions évaluables (QCM, vrai/faux, étapes à ranger…),
jamais retirées.

## Journal

- 2026-11-09 : `seriesFormExcludesCourseCards(mode)` (`src/lib/questions/course-card.ts`), branchée
  au lancement et au « Recommencer » de `/automaths/test`. Série faite seulement de cartes lancée en
  Entraînement → message d'erreur au lieu d'une série vide. ADR 0009 et CONTEXT.md précisés.
