# Chantier `idees-tle-probas` : probabilités de Terminale spécialité, idées reprises d'ailleurs

## Reprendre ici

_Mis à jour le 2026-11-24, phase 0 envoyée à David._

- **État** : relevé fait (11 exercices TSP1 à TSP4), phase 0 envoyée (7 fiches + Q1). Rien n'est écrit.
- **Prochaine action** : lire les verdicts de la page à cocher (`ArtifactData list verdicts`), puis écrire le gros lot.
- **En attente de David** : les verdicts des fiches F1 à F8 et la question Q1 (la calculatrice pour la loi binomiale).
- **Pièges en cours** : réservation de la rubrique pas encore poussée sur `main` (un `deploy:prod` tenait le verrou
  le 2026-11-24) : la pousser avant tout le reste.
- **Worktree / branche** : `../ubumaths-wt-idees-tle-probas` · `feat/idees-tle-probas`.

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Relevé :
[idees-tle-probas-releve.md](idees-tle-probas-releve.md) · fiches :
[idees-tle-probas-fiches.md](idees-tle-probas-fiches.md) · page à cocher :
https://claude.ai/artifact/6kVwijQ36onX4iXNpsL1Ga

## Historique

### 2026-11-24 : relevé et phase 0

- Rubrique choisie par David : probabilités (TSP1 à TSP4, 11 exercices).
- Relevé lu dans le code de la copie locale ; nos modèles relevés en prod (MCP en lecture seule) :
  19 modèles de Tle spé et 5 de 1re spé comparés, variations lues.
- Verdicts : 4 ✅, 5 🟡, 2 ❌. Constat de fond : nos modèles de loi binomiale n'utilisent jamais la
  calculatrice (table ou n ⩽ 5), les leurs toujours. C'est Q1.
- Fiches : 2 modèles neufs (F2 calculatrice, TSPE-510 ; F3 vocabulaire avec une table, TSPE-619) et
  8 variations (F1 ecf4d46b, F4 4ee9a359 ×2, F5 7974722d, F6 0943e867 ×2, F7 95f73515 ×2).
- Question d'accès : personne ne gagne d'accès. Outil manquant : l'éditeur Python exécuté, déjà n° 49.
- À faire avant d'écrire : bornes de `docs/systeme/programmes/bornes/lycee/` pour les plages, règles du
  tag en base, réservation des 5 modèles publiés dans le tableau de répartition.
