# Décisions d'architecture (ADR)

Une décision **tranchée par David** = un fichier. Le glossaire des termes est dans
[`CONTEXT.md`](../../CONTEXT.md).

**Règle** : une décision listée ici **ne se re-propose pas**. Si un fait nouveau la remet en cause, le
dire explicitement (« contredit l'ADR 000X, parce que… ») et laisser David rouvrir — ne jamais la
contourner en silence.

| #    | Décision                                                                                                             | Date       |
| ---- | -------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0001 | [Correction des réponses côté client](0001-correction-cote-client.md)                                                | 2026-09-13 |
| 0002 | [Mono-professeur, école = frontière sociale](0002-mono-professeur-ecole-frontiere-sociale.md)                        | 2026-06-17 |
| 0003 | [Données hébergées en UE (eu-west-3)](0003-donnees-hebergees-en-ue.md)                                               | 2026-06-13 |
| 0004 | [PDF : Typst (WASM) + jsPDF](0004-pdf-typst-et-jspdf.md)                                                             | 2026-06-11 |
| 0005 | [Publication par élément, accès hérité de la classe](0005-publication-par-element-acces-herite-de-la-classe.md)      | 2026-09-13 |
| 0006 | [Réduire pour comparer, pas pour écrire](0006-reduire-pour-comparer-pas-pour-ecrire.md)                              | 2026-09-20 |
| 0007 | [Un moteur de simplification, quatre intentions](0007-un-moteur-quatre-intentions.md)                                | 2026-09-21 |
| 0008 | [Référentiel famille A abandonné](0008-referentiel-famille-a-abandonne.md)                                           | 2026-09-06 |
| 0009 | [Carte de cours : type explicite `course_card`](0009-carte-de-cours-type-explicite.md)                               | 2026-09-28 |
| 0010 | [Pas de re-vérification serveur du Python](0010-pas-de-reverification-serveur-python.md)                             | 2026-08-27 |
| 0011 | [Fiche d'automatismes : instances figées par une graine](0011-fiche-d-automatismes-figee-par-graine.md)              | 2026-09-28 |
| 0012 | [Les hypothèses de l'énoncé restreignent la comparaison](0012-hypotheses-de-l-enonce-restreignent-la-comparaison.md) | 2026-09-29 |

## Écrire un ADR

Fichier `NNNN-titre-court.md`, en français, court (une page) :

```markdown
# NNNN — Titre

- **Statut** : acceptée | remplacée par NNNN | abandonnée
- **Date** : AAAA-MM-JJ · **Décidée par** : David

## Contexte

Le problème, et les faits mesurés qui comptaient.

## Décision

Ce qui est retenu, en une ou deux phrases.

## Écarté

Les options rejetées, et pourquoi (c'est ce qui évite de les re-proposer).

## Conséquences

Ce que ça implique pour le code, y compris ce qu'on accepte de perdre.
```

On ne réécrit pas un ADR accepté : une décision qui change donne un **nouvel** ADR, et l'ancien passe
en « remplacée par NNNN ».
