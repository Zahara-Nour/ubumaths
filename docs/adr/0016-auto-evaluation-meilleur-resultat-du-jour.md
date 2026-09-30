# 0016 — Auto-évaluation : le meilleur résultat du jour

- **Statut** : acceptée
- **Date** : 2026-09-30 · **Décidée par** : David

## Contexte

Deux formes laissent l'élève juger lui-même sa réponse : les **flash-cards** d'une série (« J'avais
trouvé » / « Je n'avais pas trouvé ») et les **cartes de cours** (« Je savais » / « Je ne savais pas »).
Chaque jugement met à jour la planification FSRS de la question. Sans règle, un élève qui enchaîne la
même série en répondant « J'avais trouvé » replanifie la question plusieurs fois par jour (relevé par
l'audit de sécurité de #554). Les cartes de cours gardaient jusqu'ici le **premier** résultat du jour.

## Décision

Pour une auto-évaluation, l'élève peut refaire une question autant de fois qu'il veut dans la journée
(jour scolaire) ; la planification FSRS ne garde **qu'un résultat par jour et par question : le
meilleur**. Les traces (`skill_attempts`) gardent toutes les réponses. Une révision du jour **corrigée
par l'application** (Entraînement, Course, évaluation) n'est jamais effacée par une auto-évaluation.

## Écarté

- **Toutes les révisions comptent** : l'élève replanifie une question à volonté en se déclarant juste.
- **Le premier résultat du jour** (règle précédente des cartes de cours) : pénalise l'élève qui se
  trompe le matin puis retravaille et réussit le soir.
- **Une seule trace par jour** (appliquer la règle à `skill_attempts`) : les traces restent l'historique
  réel de ce que l'élève a fait (décision Q17).

## Conséquences

- Chaque révision auto-évaluée garde dans `review_history` l'état de la fiche juste avant elle
  (`before`) ; une meilleure note plus tard le même jour repart de cet état (`reviewBestOfDay`,
  `src/lib/server/srs/best-of-day.ts`).
- Une révision du jour sans `before` (faite par un autre chemin) bloque tout remplacement ce jour-là.
- Les traces auto-évaluées continuent d'alimenter le suivi du référentiel à chaque réponse.
