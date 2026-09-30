# 0014 — L'acquisition des compétences repose sur le verdict du client (à réétudier)

- **Statut** : acceptée — **à réétudier plus tard** (décision de David)
- **Date** : 2026-09-30 · **Décidée par** : David

## Contexte

L'ADR 0001 garde la correction côté client pour l'entraînement : les statistiques sont « un outil
pour l'élève, jamais une note », et construire une évaluation dessus impose de rouvrir la décision.

Depuis, ce même verdict alimente le **suivi** : `/api/skill-attempts`, `/api/tests/save` et
`/api/srs/review/submit` enregistrent le « juste / faux » envoyé par le navigateur, sans revérifier ;
un trigger en déduit `student_point_state` (acquisition des compétences du référentiel), visible par
le professeur. Un élève peut donc faire passer une compétence en « acquise » sans l'avoir montrée
(verdict forgé, ou réponse attendue lue dans la page). 228 modèles sont publiés depuis le
2026-09-29 : ces données commencent à s'accumuler.

## Décision

On **garde la correction côté client, y compris pour l'acquisition des compétences**. Les données de
suivi sont **indicatives**, sans garantie contre la triche. **La question sera réétudiée plus tard.**

Pas de mention dans l'interface : Chiphre est mono-professeur (ADR 0002), et le seul professeur connaît
cette limite.

## Écarté (pour l'instant, pas définitivement)

- **Revérification serveur** des tentatives qui comptent pour l'acquisition : le correcteur doit alors
  tourner aussi côté serveur (coût moyen).
- **Séparer entraînement et évaluation** : entraînement corrigé dans le navigateur, évaluations notées
  corrigées par le serveur sans que la réponse attendue parte au navigateur (plus gros chantier).

## Conséquences

- Aucun changement de code.
- Lire `student_point_state` et les badges comme un indicateur, pas comme une preuve.
- À la réévaluation, repartir des deux options ci-dessus. Les combats navadra corrigent déjà côté
  serveur (`game/challenge-variables.ts`) : c'est le modèle existant.
- Depuis #549, seuls les comptes élèves enregistrent via `/api/skill-attempts` ; `/api/tests/save` et
  `/api/srs/review/submit` n'ont pas encore de filtre de rôle.
