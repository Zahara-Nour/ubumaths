# Chantier `idees-tle-geometrie-espace`

## Reprendre ici

_Mis à jour le 2026-11-26, avant la première PR._

- **État** : relevé fait ([releve](idees-tle-geometrie-espace-releve.md) : 10 ✅, 13 🟡, 3 ❌) ; phase 0 publiée ([fiches](idees-tle-geometrie-espace-fiches.md), page à cocher https://claude.ai/artifact/6Cx9jxScwsv78fkiAM9znZ) : 3 modèles neufs (N1-N3, 10 variations), 11 variations de 9 modèles publiés (V1-V9), Q1 (deux outils à noter).
- **Prochaine action** : lire les verdicts de la page (collection `verdicts`) ; puis réserver les modèles publiés retenus dans le tableau de répartition, et écrire le lot.
- **En attente de David** : verdicts des 14 fiches.
- **Pièges en cours** : `shared.blankDefaults` d'un modèle règle ses cases (2b240d8c : `vecteur` + `colineaire`) — lire `shared` avant de croire une case non réglée.
- **Worktree / branche** : `../ubumaths-wt-idees-tle-geometrie-espace`, `chore/idees-tle-geometrie-espace`.

---

## Contexte

Skill `idees-rubrique`. Rubrique « Géométrie dans l'espace » de Terminale spécialité, reprise d'une
autre plateforme (`TSG2-10` à `TSG2-50`, 26 exercices sans les anciennes versions).

## Existant en prod (relevé du 2026-11-26)

- 61 modèles publiés de Terminale spécialité sur l'espace (149 variations).
- Points des trois rubriques du BO (« Manipulation des vecteurs, des droites et des plans de
  l'espace », « Orthogonalité et distances dans l'espace », « Représentations paramétriques et
  équations cartésiennes ») : presque tous les savoir-faire ont un modèle. Les points sans modèle
  sont des « connaissances » : TSPE-326 (vecteurs de l'espace), 327 (combinaisons linéaires),
  328 (droites, vecteurs directeurs), 330 (plans, direction), 342 (produit scalaire), 348
  (orthogonalité de deux droites), 349 (vecteur normal), 560 (plan passant par A normal à n),
  350 (projeté sur une droite), 561 (projeté sur un plan), 363 (représentation paramétrique).
