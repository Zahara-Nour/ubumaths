# Chantier `idees-tle-geometrie-espace`

## Reprendre ici

_Mis à jour le 2026-11-26, phase 0 validée (pas encore de PR)._

- **État** : relevé fait ([releve](idees-tle-geometrie-espace-releve.md) : 10 ✅, 13 🟡, 3 ❌) ; phase 0 **validée par David le 2026-11-26** (« je valide » dans la conversation : toutes les fiches oui, Q1 oui ; la page à cocher https://claude.ai/artifact/6Cx9jxScwsv78fkiAM9znZ est restée vide). 9 modèles publiés réservés dans le tableau de répartition (`c564645c5` sur `main`).
- **Prochaine action** : écrire le gros lot, d'un coup ([fiches](idees-tle-geometrie-espace-fiches.md)) : N1-N3 en modèles neufs (`docs/wip/questions/idees-tle-geometrie-espace-neufs.py` → `scripts/questions/idees-tle-geometrie-espace-neufs/`), V1-V9 ajoutées **à la fin** des 9 modèles exportés de prod (`scripts/questions/idees-tle-geometrie-espace-publies/`) ; Q1 : noter les deux outils (case « représentation paramétrique » jugée « même droite », point au tiers d'une arête du `solide`) dans `docs/wip/outils-manquants.md`, dans la PR.
- **En attente de David** : rien.
- **Pièges en cours** : `shared.blankDefaults` d'un modèle règle ses cases (2b240d8c : `vecteur` + `colineaire`) — lire `shared` avant de croire une case non réglée. Pas de Oui / Non : V3, V4, V5 en « coche les… ». Bloc `solide` : `points:` = `milieu`, `centre` seulement (quarts = milieu d'un milieu).
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

## Phase 0 (2026-11-26)

- Page à cocher publiée, 14 fiches : N1 (écrire une représentation paramétrique, TSPE-365), N2 (position
  de deux droites en repère, TSPE-567), N3 (coordonnées d'un point dans un repère du cube, TSPE-332),
  V1-V9 (11 variations de d192da3e, d6938108, ac94a453, 33be404b, 2b240d8c, eae25eba, 4f056eb3,
  aaa16821, 31b49cdf), R (ce qui n'est pas repris), Q1 (deux outils à noter).
- David : « je valide » (2026-11-26) → toutes les fiches oui, Q1 oui.
