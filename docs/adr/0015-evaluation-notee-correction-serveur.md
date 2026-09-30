# 0015 — Évaluation notée : correction côté serveur

- **Statut** : acceptée — restreint [ADR 0001](0001-correction-cote-client.md) aux usages non notés
- **Date** : 2026-09-30 · **Décidée par** : David

## Contexte

L'[ADR 0001](0001-correction-cote-client.md) garde la correction dans le navigateur : l'instance part
avec sa réponse attendue, le serveur reçoit un verdict déjà rendu. Il en tire deux limites : les
statistiques sont « un outil pour l'élève, jamais une note », et « si un jour il faut noter, le chantier
est la correction serveur ».

Le 2026-09-30, David définit l'**évaluation** : une série assignée à des élèves, dont les réponses sont
enregistrées, vérifiées, puis donnent une note. TinyMath notait déjà ses évaluations, mais c'est le
navigateur qui écrivait la note en base. En production Chiphre : 1 évaluation, 0 assignation.

## Décision

Pour les **évaluations** (et elles seules), la réponse de l'élève est corrigée par le **serveur** ; c'est
ce verdict qui fait la note. Partout ailleurs (Automaths, flash-cards, interactif, course aux nombres
hors évaluation, SRS), l'ADR 0001 s'applique inchangé.

## Écarté

- **Garder la correction dans le navigateur pour les évaluations** : l'ADR 0001 l'exclut lui-même dès
  qu'une note est en jeu — un élève pourrait écrire sa propre note.
- **Corriger sur le serveur partout** : coût élevé pour une menace étroite hors notation (raison de
  l'ADR 0001, toujours valable).

## Conséquences

- Aucune note ne s'enregistre tant que la correction serveur n'existe pas : c'est un chantier à part,
  qui ne bloque pas les autres usages d'une série.
- À concevoir dans ce chantier : ce que le navigateur reçoit pendant une évaluation (aujourd'hui,
  l'instance porte la réponse attendue) et le lien entre verdict serveur et SRS.
